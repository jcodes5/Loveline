import { useMemo, useState } from "react";
import { ArrowLeft, Heart, LoaderCircle, LockKeyhole, MessageCircleHeart, RefreshCw, Send, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeartBeat } from "@/components/motion/HeartBeat";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLoveReactions, type LoveReaction } from "@/hooks/use-love-reactions";
import { useQuoteCards, quoteCardImageUrl, type QuoteCard } from "@/hooks/use-quote-cards";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const quoteCards = useQuoteCards();
  const reactions = useLoveReactions();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const byCard = useMemo(() => {
    const map = new Map<string, LoveReaction[]>();
    for (const reaction of reactions.reactions) {
      if (!reaction.cardId) continue;
      const list = map.get(reaction.cardId) ?? [];
      list.push(reaction);
      map.set(reaction.cardId, list);
    }
    return map;
  }, [reactions.reactions]);

  const standaloneHearts = useMemo(() => reactions.reactions.filter((reaction) => !reaction.cardId), [reactions.reactions]);
  const loading = quoteCards.loading || reactions.loading;
  const error = quoteCards.error ?? reactions.error;

  function setNote(cardId: string, value: string) {
    setNotes((current) => ({ ...current, [cardId]: value }));
  }

  async function handleFeedback(card: QuoteCard) {
    const note = notes[card.id]?.trim() || null;
    const result = await reactions.sendLove(card.id, note);
    if (result.error) {
      toast({ title: "We couldn't send that.", description: result.error.message });
      return;
    }
    if (note) setNotes((current) => ({ ...current, [card.id]: "" }));
    toast({ title: "Heart sent", description: note ? "Your note is on its way to them." : "A little heart is on its way to them." });
  }

  function senderLabel(senderId: string) {
    return user?.id === senderId ? "You" : "Your partner";
  }

  function FeedbackList({ card }: { card: QuoteCard }) {
    const cardReactions = byCard.get(card.id) ?? [];
    return (
      <div className="mt-5 space-y-3">
        {cardReactions.length > 0 && (
          <ul className="space-y-2">
            {cardReactions.map((reaction) => (
              <li key={reaction.id} className="rounded-2xl bg-surface-muted/60 px-4 py-3 transition-colors hover:bg-surface-muted">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary-dark">
                  <HeartBeat>
                    <Heart className="size-3.5 fill-current" aria-hidden="true" />
                  </HeartBeat>
                  {senderLabel(reaction.senderId)} sent a heart
                  <span className="font-normal normal-case text-muted-foreground">{formatTimestamp(reaction.createdAt)}</span>
                </div>
                {reaction.note && <p className="mt-2 text-base font-medium leading-7">“{reaction.note}”</p>}
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void handleFeedback(card);
          }}
        >
          <div className="relative flex-1">
            <Input
              value={notes[card.id] ?? ""}
              onChange={(event) => setNote(card.id, event.target.value)}
              maxLength={280}
              className="h-11 rounded-xl pr-3"
              placeholder="A short note with your heart… (optional)"
              aria-label={`Send a heart back for the card by ${card.quoteAuthor}`}
              disabled={reactions.saving}
            />
          </div>
          <Button type="submit" variant="secondary" className="h-11 shrink-0 rounded-full" disabled={reactions.saving}>
            {reactions.saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
            Send a heart back
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="border-b border-border/70 pb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Loveline
        </Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Loveline / Messages</p>
            <h1 className="font-display mt-2 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl">The words between you.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Every card you have sent each other, and the hearts that came back — together in one place.</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/10 bg-primary-soft/40 px-3.5 py-2 text-xs font-medium text-primary-dark sm:self-auto">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            Private to your Loveline
          </div>
        </div>
      </header>

      {error && (
        <Alert variant="destructive" className="mt-8">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="ghost" className="h-8 rounded-full px-2 text-destructive" onClick={() => void Promise.all([quoteCards.refresh(), reactions.refresh()])}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="mt-10 grid gap-5 md:grid-cols-2" aria-busy="true" aria-label="Loading your messages">
          {[1, 2, 3, 4].map((item) => <div className="h-64 animate-pulse rounded-card bg-surface-muted" key={item} />)}
        </div>
      ) : quoteCards.cards.length === 0 && standaloneHearts.length === 0 ? (
        <section className="mt-10 rounded-card border border-dashed border-border bg-surface-muted/50 px-6 py-16 text-center sm:px-12">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
            <MessageCircleHeart className="size-7" aria-hidden="true" />
          </div>
          <h2 className="font-display mt-7 text-3xl font-semibold tracking-[-0.03em]">No messages yet.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">Make a card in the studio and send it — the hearts that come back will live right here.</p>
          <div className="mt-6">
            <Button asChild className="h-10 rounded-full"><Link to="/create">Open the studio</Link></Button>
          </div>
        </section>
      ) : (
        <>
          <section className="mt-10" aria-labelledby="messages-list-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Sent and received</p>
                <h2 id="messages-list-title" className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em]">Cards and the hearts they carried.</h2>
              </div>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="size-4" aria-hidden="true" />{quoteCards.cards.length} {quoteCards.cards.length === 1 ? "card" : "cards"}</span>
            </div>

            {quoteCards.cards.length === 0 ? (
              <p className="mt-6 rounded-card border border-dashed border-border bg-surface-muted/50 px-6 py-8 text-center text-sm text-muted-foreground">The cards you send will wait for you here.</p>
            ) : (
              <Stagger className="mt-5 grid gap-5 md:grid-cols-2" stagger={0.06}>
                {quoteCards.cards.map((card) => {
                  const sentByMe = user?.id === card.createdBy;
                  return (
                    <StaggerItem key={card.id}>
                      <article className="card-lift group overflow-hidden rounded-card border border-border bg-surface shadow-subtle">
                        <div className="overflow-hidden">
                          <img src={quoteCardImageUrl(card.svg)} alt={`A card by ${card.quoteAuthor}`} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                        </div>
                        <div className="p-5 sm:p-6">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">{sentByMe ? "You sent this" : "Your partner sent this"}</p>
                            <span className="text-xs text-muted-foreground">{formatTimestamp(card.createdAt)}</span>
                          </div>
                          <p className="mt-3 font-display text-xl font-semibold leading-tight tracking-[-0.02em]">“{card.quoteText}”</p>
                          <p className="mt-2 text-sm text-muted-foreground">— {card.quoteAuthor}{card.quoteSource ? `, ${card.quoteSource}` : ""}</p>
                          <FeedbackList card={card} />
                        </div>
                      </article>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            )}
          </section>

          {standaloneHearts.length > 0 && (
            <Reveal className="mt-10" delay={0.05}>
              <section aria-labelledby="hearts-list-title">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Little waves</p>
                    <h2 id="hearts-list-title" className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em]">Hearts with nowhere else to land.</h2>
                  </div>
                </div>
                <Stagger className="mt-5 grid gap-3 sm:grid-cols-2" stagger={0.05}>
                  {standaloneHearts.map((reaction) => (
                    <StaggerItem key={reaction.id}>
                      <article className="card-lift rounded-2xl bg-[#30242a] p-5 text-[#fff8f6] shadow-subtle dark:bg-[#2a2226]">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#efb0be]">
                          <HeartBeat>
                            <Heart className="size-3.5 fill-current" aria-hidden="true" />
                          </HeartBeat>
                          {senderLabel(reaction.senderId)} sent a heart
                        </div>
                        <p className="mt-2 text-sm text-white/60">{formatTimestamp(reaction.createdAt)}</p>
                        {reaction.note && <p className="mt-3 text-base font-medium leading-7">“{reaction.note}”</p>}
                      </article>
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            </Reveal>
          )}
        </>
      )}
    </div>
  );
}