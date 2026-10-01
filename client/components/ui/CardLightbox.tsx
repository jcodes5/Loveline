import { useEffect, useRef } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { quoteCardImageUrl, type QuoteCard } from "@/hooks/use-quote-cards";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface CardLightboxProps {
  card: QuoteCard | null;
  onClose: () => void;
}

export function CardLightbox({ card, onClose }: CardLightboxProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { session } = useAuth();

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

  async function handleDownload() {
    if (!card || !session?.access_token) return;

    try {
      const response = await fetch(`/api/quote-cards/${encodeURIComponent(card.id)}/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `loveline-card-${card.id}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch {
      const imageUrl = card.imageUrl ?? quoteCardImageUrl(card.svg);
      window.open(imageUrl, "_blank");
    }
  }

  if (!card) return null;

  const imageUrl = card.imageUrl
    ? `/api/quote-cards/${encodeURIComponent(card.id)}/image`
    : quoteCardImageUrl(card.svg);

  return (
    <div
      ref={overlayRef}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/75 backdrop-blur-md",
        "animate-in fade-in duration-200",
        "p-3 sm:p-4 md:p-6",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={`Quote card by ${card.quoteAuthor}`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Close button - more accessible on mobile */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close card view"
        className={cn(
          "absolute z-10 grid size-10 place-items-center rounded-full",
          "bg-white/10 text-white backdrop-blur-sm transition",
          "hover:bg-white/20 active:scale-95",
          "top-3 right-3 sm:top-4 sm:right-4",
          "touch-target",
        )}
      >
        <X className="size-5" aria-hidden="true" />
      </button>

      {/* Outer container — never taller than the viewport */}
      <div
        className="relative flex w-full max-w-[90vw] sm:max-w-[480px] md:max-w-[600px] lg:max-w-[720px] flex-col gap-3"
        style={{ maxHeight: "calc(100dvh - 1.5rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card image — zoom/pan on desktop, scroll on mobile */}
        <div className="relative min-h-0 flex-1 w-full overflow-auto rounded-2xl sm:rounded-[28px] shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200 touch-pan-x touch-pan-y">
          <img
            src={imageUrl}
            alt={`A card by ${card.quoteAuthor}`}
            className="block w-full object-contain"
            draggable={false}
            style={{ minHeight: 0, maxWidth: "100%" }}
          />
        </div>

        {/* Actions bar — always visible at the bottom, wraps on narrow screens */}
        <div className="flex shrink-0 flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
          <div className="min-w-0 w-full text-center sm:text-left">
            <p className="truncate text-sm sm:text-base font-semibold text-white">
              &ldquo;{card.quoteText.length > 100 ? card.quoteText.slice(0, 100) + "…" : card.quoteText}&rdquo;
            </p>
            <p className="mt-1 truncate text-xs sm:text-sm text-white/60">
              &mdash; {card.quoteAuthor}
              {card.quoteSource ? `, ${card.quoteSource}` : ""}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleDownload}
            className="w-full sm:w-auto shrink-0 rounded-full bg-white text-black hover:bg-white/90 active:scale-95 touch-target"
            size="sm"
          >
            <Download className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
