import { useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Heart, ImagePlus, LoaderCircle, LockKeyhole, Star, Trash2, Upload } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { useMemories } from "@/hooks/use-memories";

function displayDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function Memories() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { memories, loading, saving, error, refresh, addMemory, removeMemory, toggleFavorite, updateAlbum } = useMemories();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const isOwner = Boolean(user && relationship?.ownerId === user.id);
  const [filterAlbum, setFilterAlbum] = useState<string | "all" | "favorites">("all");

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSavedMessage(null);
    if (!file) {
      setFormError("Choose a photo to add to your memories.");
      return;
    }

    const result = await addMemory(file, caption, takenAt || null);
    if (result.error) {
      setFormError(result.error.message);
      return;
    }

    setFile(null);
    setCaption("");
    setTakenAt("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSavedMessage("Your memory is safely tucked away.");
  }

  async function handleRemove(id: string) {
    if (!window.confirm("Remove this memory from Loveline?")) return;
    const result = await removeMemory(id);
    if (result.error) setFormError(result.error.message);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="flex flex-col gap-6 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Loveline
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Loveline / Memories</p>
          <h1 className="font-display mt-2 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl">Your story, kept close.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">The photos, places, and ordinary moments that became yours.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/10 bg-primary-soft/40 px-3.5 py-2 text-xs font-medium text-primary-dark sm:self-auto">
          <LockKeyhole className="size-3.5" aria-hidden="true" />
          Private to your Loveline
        </div>
      </header>

      {isOwner && (
        <section className="mt-8 rounded-card border border-primary/15 bg-surface p-5 shadow-subtle sm:p-7" aria-labelledby="add-memory-title">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
              <ImagePlus className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Owner space</p>
              <h2 id="add-memory-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">Add a little moment.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">JPG, PNG, or WebP images up to 7 MB. The original stays in private authenticated storage.</p>
            </div>
          </div>

          {formError && <Alert variant="destructive" className="mt-6"><AlertDescription>{formError}</AlertDescription></Alert>}
          {savedMessage && <Alert className="mt-6 border-success/25 bg-success/10"><AlertDescription>{savedMessage}</AlertDescription></Alert>}

          <form className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]" onSubmit={handleUpload}>
            <div className="space-y-2">
              <Label htmlFor="memory-file">Photo</Label>
              <Input
                ref={fileInputRef}
                id="memory-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={saving}
                className="h-12 rounded-xl file:mr-3 file:rounded-full file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-dark"
              />
              <p className="text-xs text-muted-foreground">{file ? file.name : "Nothing selected yet."}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memory-date">When was it?</Label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                <Input id="memory-date" type="date" value={takenAt} onChange={(event) => setTakenAt(event.target.value)} disabled={saving} className="h-12 rounded-xl pl-10" />
              </div>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="memory-caption">A little caption <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea id="memory-caption" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={240} disabled={saving} className="min-h-20 rounded-xl leading-7" placeholder="The kind of day you wish you could fold up and keep…" />
            </div>
            <div className="lg:col-span-2">
              <Button className="h-11 rounded-full px-5" type="submit" disabled={saving}>
                {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
                {saving ? "Keeping it close…" : "Add to memories"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {error && !isOwner && (
        <Alert variant="destructive" className="mt-8">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="ghost" className="h-8 rounded-full px-2 text-destructive" onClick={() => void refresh()}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}
      {error && isOwner && !formError && (
        <Alert variant="destructive" className="mt-8">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="ghost" className="h-8 rounded-full px-2 text-destructive" onClick={() => void refresh()}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading memories">
          {[1, 2, 3].map((item) => <div className="aspect-[4/3] animate-pulse rounded-card bg-surface-muted" key={item} />)}
        </div>
      ) : memories.length === 0 ? (
        <section className="mt-10 rounded-card border border-dashed border-border bg-surface-muted/50 px-6 py-16 text-center sm:px-12">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-dark"><ImagePlus className="size-7" aria-hidden="true" /></div>
          <h2 className="font-display mt-7 text-3xl font-semibold tracking-[-0.03em]">A blank page can be beautiful.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">When there is a first moment to keep, it will find its place here.</p>
        </section>
      ) : (
        <section className="mt-10" aria-labelledby="memory-grid-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Your gallery</p>
              <h2 id="memory-grid-title" className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em]">Little pieces of us.</h2>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterAlbum} onValueChange={(v) => setFilterAlbum(v as any)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All memories</SelectItem>
                  <SelectItem value="favorites">Favorites only</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{memories.length} {memories.length === 1 ? "memory" : "memories"}</span>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memories
              .filter((m) => filterAlbum === "all" || (filterAlbum === "favorites" ? m.isFavorite : m.albumId === filterAlbum))
              .map((memory) => (
                <article key={memory.id} className="group overflow-hidden rounded-card border border-border bg-surface shadow-subtle">
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
                    <img src={memory.thumbnailUrl || memory.url} alt={memory.caption || "A saved Loveline memory"} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    {isOwner && (
                      <div className="absolute top-3 right-3 flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`rounded-full ${memory.isFavorite ? "text-yellow-400" : "bg-black/45 text-white hover:bg-yellow-400 hover:text-black"}`}
                          aria-label={memory.isFavorite ? "Remove from favorites" : "Add to favorites"}
                          onClick={() => void toggleFavorite(memory.id, memory.isFavorite)}
                          disabled={saving}
                        >
                          <Star className={`size-4 ${memory.isFavorite ? "fill-current" : ""}`} aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full bg-black/45 text-white hover:bg-destructive hover:text-white"
                          aria-label="Remove memory"
                          onClick={() => void handleRemove(memory.id)}
                          disabled={saving}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    {memory.caption && <p className="text-sm leading-6 text-foreground">{memory.caption}</p>}
                    {displayDate(memory.takenAt) && <p className="mt-2 text-xs text-muted-foreground">{displayDate(memory.takenAt)}</p>}
                    {memory.albumId && <p className="mt-2 text-xs text-muted-foreground">Album</p>}
                  </div>
                </article>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
