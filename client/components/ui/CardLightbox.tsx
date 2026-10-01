import { useEffect, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
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
  const [downloading, setDownloading] = useState(false);

  const getDisplayImageUrl = () => {
    if (card?.imageUrl && session?.access_token) {
      return `/api/quote-cards/${encodeURIComponent(card.id)}/image?token=${encodeURIComponent(session.access_token)}`;
    }
    if (card?.svg) {
      return quoteCardImageUrl(card.svg);
    }
    return "";
  };

  const initialSrc = getDisplayImageUrl();
  const [imageSrc, setImageSrc] = useState(initialSrc);

  useEffect(() => {
    if (card) {
      setImageSrc(getDisplayImageUrl());
    }
  }, [card, session?.access_token]);

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
    if (!card || !session?.access_token) {
      setDownloading(false);
      return;
    }
    setDownloading(true);

    try {
      // 1. Primary method: Use the dedicated download endpoint which proxies the authenticated Cloudinary image
      const downloadRes = await fetch(`/api/quote-cards/${encodeURIComponent(card.id)}/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (downloadRes.ok) {
        const blob = await downloadRes.blob();
        if (blob.size > 100) {
          const blobUrl = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = blobUrl;
          anchor.download = `loveline-card-${card.id || "quote"}.png`;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
          return;
        }
      }

      // 2. Fallback: Use the /api/quote-cards/render endpoint to re-render
      if (card.relationshipId) {
        try {
          const renderRes = await fetch("/api/quote-cards/render", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              relationshipId: card.relationshipId,
              quoteText: card.quoteText,
              quoteAuthor: card.quoteAuthor,
              quoteSource: card.quoteSource,
              palette: card.palette,
              template: card.template,
              bgType: card.bgType,
              gradient: card.gradient,
              backgroundDataUrl: card.backgroundDataUrl,
              alignment: card.alignment,
              showDate: card.showDate,
            }),
          });

          if (renderRes.ok) {
            const blob = await renderRes.blob();
            if (blob.size > 100) {
              const blobUrl = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = blobUrl;
              anchor.download = `loveline-card-${card.id || "quote"}.png`;
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();
              setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
              return;
            }
          }
        } catch (renderErr) {
          console.warn("Server render endpoint failed:", renderErr);
        }
      }

      // 3. Last resort: download the SVG file as a valid .svg vector file
      if (card.svg) {
        const svgBlob = new Blob([card.svg], { type: "image/svg+xml;charset=utf-8" });
        const blobUrl = URL.createObjectURL(svgBlob);
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = `loveline-card-${card.id || "quote"}.svg`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
        return;
      }
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  if (!card) return null;

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
      {/* Close button */}
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
        className="relative flex w-full max-w-[90vw] sm:max-w md:max-w lg:max-w flex-col gap-3"
        style={{ maxHeight: "calc(100dvh - 1.5rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card image */}
        <div className="relative min-h-0 flex-1 w-full overflow-auto rounded-2xl sm:rounded-[28px] shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200 touch-pan-x touch-pan-y">
          <img
            src={imageSrc}
            alt={`A card by ${card.quoteAuthor}`}
            className="block w-full object-contain"
            draggable={false}
            style={{ minHeight: 0, maxWidth: "100%" }}
            onError={() => {
              // If proxy fails, fallback to inline SVG vector representation
              if (card.svg) {
                const svgUrl = quoteCardImageUrl(card.svg);
                if (imageSrc !== svgUrl) {
                  setImageSrc(svgUrl);
                }
              }
            }}
          />
        </div>

        {/* Actions bar */}
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
            disabled={downloading}
            className="w-full sm:w-auto shrink-0 rounded-full bg-white text-black hover:bg-white/90 active:scale-95 touch-target"
            size="sm"
          >
            {downloading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{downloading ? "Downloading..." : "Download"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
