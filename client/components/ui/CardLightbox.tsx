import { useEffect, useRef } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { quoteCardImageUrl, type QuoteCard } from "@/hooks/use-quote-cards";
import { cn } from "@/lib/utils";

interface CardLightboxProps {
  card: QuoteCard | null;
  onClose: () => void;
}

export function CardLightbox({ card, onClose }: CardLightboxProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!card) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [card, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (card) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [card]);

  function handleDownload() {
    if (!card) return;
    const imageUrl = card.imageUrl ?? quoteCardImageUrl(card.svg);
    const anchor = document.createElement("a");
    anchor.href = imageUrl;
    anchor.download = `loveline-card-${card.id}.${card.imageUrl ? "png" : "svg"}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  if (!card) return null;

  const imageUrl = card.imageUrl ?? quoteCardImageUrl(card.svg);

  return (
    <div
      ref={overlayRef}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/75 backdrop-blur-md",
        "animate-in fade-in duration-200",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={`Quote card by ${card.quoteAuthor}`}
      onClick={(e) => {
        // Close when clicking the backdrop (not the card itself)
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close card view"
        className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
      >
        <X className="size-5" aria-hidden="true" />
      </button>

      <div
        className="relative mx-4 flex w-full max-w-2xl flex-col items-center gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card image */}
        <div className="w-full overflow-hidden rounded-[28px] shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
          <img
            src={imageUrl}
            alt={`A card by ${card.quoteAuthor}`}
            className="aspect-square w-full object-cover"
            draggable={false}
          />
        </div>

        {/* Actions bar */}
        <div className="flex w-full items-center justify-between gap-4 rounded-2xl bg-white/10 px-5 py-3.5 backdrop-blur-sm">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              &ldquo;{card.quoteText.length > 80 ? card.quoteText.slice(0, 80) + "…" : card.quoteText}&rdquo;
            </p>
            <p className="mt-0.5 truncate text-xs text-white/60">
              &mdash; {card.quoteAuthor}
              {card.quoteSource ? `, ${card.quoteSource}` : ""}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleDownload}
            className="shrink-0 rounded-full bg-white text-black hover:bg-white/90 active:scale-95"
            size="sm"
          >
            <Download className="size-4" aria-hidden="true" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
