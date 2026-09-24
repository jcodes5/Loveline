import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpDown, ImagePlus, Star } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { useAlbums } from "@/hooks/use-albums";
import { useMemories } from "@/hooks/use-memories";

function formatDate(value: string | null) {
  if (!value) return "Date not added";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value + "T00:00:00Z"));
}

export default function MemoryAlbum() {
  const { albumId } = useParams();
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { albums, loading: albumsLoading } = useAlbums();
  const { memories, loading, error, toggleFavorite, updateAlbum, saving } = useMemories();
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const album = albums.find((item) => item.id === albumId);
  const isOwner = Boolean(user && relationship?.ownerId === user.id);
  const albumMemories = useMemo(() => {
    const selected = memories.filter((memory) =>
      memory.albumId === albumId && (filter === "all" || memory.isFavorite),
    );
    return selected.sort((left, right) => {
      const leftDate = left.takenAt ?? left.createdAt.slice(0, 10);
      const rightDate = right.takenAt ?? right.createdAt.slice(0, 10);
      return sort === "newest" ? rightDate.localeCompare(leftDate) : leftDate.localeCompare(rightDate);
    });
  }, [filter, memories, albumId, sort]);
  const cover = memories.find((memory) => memory.id === album?.coverMemoryId)
    ?? memories.find((memory) => memory.albumId === albumId);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <Link to="/memories" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All memories
      </Link>

      {loading || albumsLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading album">
          {[1, 2, 3].map((item) => <div key={item} className="aspect-[4/3] animate-pulse rounded-card bg-surface-muted" />)}
        </div>
      ) : !album ? (
        <section className="mt-10 border-y border-border py-14 text-center">
          <h1 className="font-display text-3xl font-semibold">Album not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This album may have been removed.</p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/memories">Back to memories</Link>
          </Button>
        </section>
      ) : (
        <>
          <header className="mt-7 grid gap-7 border-b border-border/70 pb-8 md:grid-cols-[1.25fr_0.75fr] md:items-end">
            <div className="aspect-[16/9] overflow-hidden rounded-card bg-surface-muted">
              {cover ? (
                <img src={cover.url} alt={cover.caption || album.name + " album cover"} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground"><ImagePlus className="size-10" aria-hidden="true" /></div>
              )}
            </div>
            <div className="pb-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Memory album</p>
              <h1 className="font-display mt-2 break-words text-4xl font-semibold leading-tight">{album.name}</h1>
              {album.description && <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{album.description}</p>}
              <p className="mt-4 text-sm text-muted-foreground">
                {albumMemories.length} {albumMemories.length === 1 ? "memory" : "memories"}
                {cover?.takenAt ? " · Cover from " + formatDate(cover.takenAt) : ""}
              </p>
              {isOwner && (
                <Button asChild variant="outline" className="mt-5">
                  <Link to="/memories">Manage albums</Link>
                </Button>
              )}
            </div>
          </header>

          {error && <p className="mt-5 text-sm text-destructive" role="alert">{error}</p>}

          <section className="mt-8" aria-labelledby="album-memories-title">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Inside this album</p>
                <h2 id="album-memories-title" className="font-display mt-1 text-2xl font-semibold">The moments</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-36" aria-label="Filter album memories"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All photos</SelectItem>
                    <SelectItem value="favorites">Favorites</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="w-40" aria-label="Sort album memories">
                    <ArrowUpDown className="mr-2 size-4" aria-hidden="true" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {albumMemories.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-display text-2xl font-semibold">No photos in this view.</p>
                <p className="mt-2 text-sm text-muted-foreground">Add photos from your memories and place them in this album.</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {albumMemories.map((memory) => (
                  <article key={memory.id} className="overflow-hidden rounded-card border border-border bg-surface">
                    <div className="group relative aspect-[4/3] overflow-hidden bg-surface-muted">
                      <img src={memory.thumbnailUrl || memory.url} alt={memory.caption || "A saved Loveline memory"} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
                      {isOwner && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-3 top-3 rounded-full bg-black/45 text-white hover:bg-yellow-400 hover:text-black"
                          aria-label={memory.isFavorite ? "Remove from favorites" : "Add to favorites"}
                          onClick={() => void toggleFavorite(memory.id, memory.isFavorite)}
                          disabled={saving}
                        >
                          <Star className={"size-4 " + (memory.isFavorite ? "fill-current text-yellow-400" : "")} aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-sm leading-6">{memory.caption || "A moment worth keeping"}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDate(memory.takenAt ?? memory.createdAt.slice(0, 10))}</p>
                      {isOwner && (
                        <Select
                          value={memory.albumId ?? "none"}
                          onValueChange={(value) => void updateAlbum(memory.id, value === "none" ? null : value)}
                          disabled={saving}
                        >
                          <SelectTrigger className="mt-3 h-9 text-xs" aria-label="Move memory to another album"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Remove from album</SelectItem>
                            {albums.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
