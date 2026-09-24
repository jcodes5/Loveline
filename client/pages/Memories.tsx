import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, FolderPlus, Heart, ImagePlus, LoaderCircle, LockKeyhole, Pencil, Star, Trash2, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { useAlbums } from "@/hooks/use-albums";
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
  const { memories, loading, saving, error, refresh, addMemory, removeMemory, toggleFavorite, updateAlbum, updateNotes } = useMemories();
  const { albums, loading: albumsLoading, saving: albumsSaving, error: albumsError, saveAlbum, removeAlbum } = useAlbums();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesSaved, setNotesSaved] = useState(false);
  const [takenAt, setTakenAt] = useState("");
  const [uploadAlbumId, setUploadAlbumId] = useState("none");
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [editingAlbumName, setEditingAlbumName] = useState("");
  const [editingAlbumDescription, setEditingAlbumDescription] = useState("");
  const [editingAlbumCoverId, setEditingAlbumCoverId] = useState("none");
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const isOwner = Boolean(user && relationship?.ownerId === user.id);
  const [filterAlbum, setFilterAlbum] = useState<string | "all" | "favorites">("all");
  const albumById = new Map(albums.map((album) => [album.id, album]));

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSavedMessage(null);
    if (!file) {
      setFormError("Choose a photo to add to your memories.");
      return;
    }

    const result = await addMemory(file, caption, takenAt || null, uploadAlbumId === "none" ? null : uploadAlbumId, notes);
    if (result.error) {
      setFormError(result.error.message);
      return;
    }

    setFile(null);
    setCaption("");
    setNotes("");
    setTakenAt("");
    setUploadAlbumId("none");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSavedMessage("Your memory is safely tucked away.");
  }

  async function handleCreateAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSavedMessage(null);
    const result = await saveAlbum({ name: albumName, description: albumDescription });
    if (result.error) {
      setFormError(result.error.message);
      return;
    }
    setAlbumName("");
    setAlbumDescription("");
    setSavedMessage("Album created.");
  }

  async function handleRemoveAlbum(id: string) {
    if (!window.confirm("Remove this album? Memories inside it will stay in Loveline.")) return;
    const result = await removeAlbum(id);
    if (result.error) setFormError(result.error.message);
    if (filterAlbum === id) setFilterAlbum("all");
    if (uploadAlbumId === id) setUploadAlbumId("none");
    if (editingAlbumId === id) setEditingAlbumId(null);
  }

  function startAlbumEdit(album: (typeof albums)[number]) {
    setEditingAlbumId(album.id);
    setEditingAlbumName(album.name);
    setEditingAlbumDescription(album.description);
    setEditingAlbumCoverId(album.coverMemoryId ?? "none");
  }

  async function handleSaveAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAlbumId) return;
    const result = await saveAlbum({
      id: editingAlbumId,
      name: editingAlbumName,
      description: editingAlbumDescription,
      coverMemoryId: editingAlbumCoverId === "none" ? null : editingAlbumCoverId,
    });
    if (result.error) {
      setFormError(result.error.message);
      return;
    }
    setEditingAlbumId(null);
    setSavedMessage("Album updated.");
  }

  async function handleRemove(id: string) {
    if (!window.confirm("Remove this memory from Loveline?")) return;
    const result = await removeMemory(id);
    if (result.error) setFormError(result.error.message);
  }

  const selectedMemory = memories.find((memory) => memory.id === selectedMemoryId) ?? null;

  function openMemory(id: string) {
    const memory = memories.find((item) => item.id === id);
    if (!memory) return;
    setSelectedMemoryId(id);
    setEditingNotes(memory.notes);
  }

  async function handleSaveNotes() {
    if (!selectedMemory) return;
    setNotesSaving(true);
    setNotesError(null);
    setNotesSaved(false);
    const result = await updateNotes(selectedMemory.id, editingNotes);
    setNotesSaving(false);
    if (result.error) {
      setNotesError(result.error.message);
      return;
    }
    setNotesSaved(true);
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
              <Label htmlFor="memory-album">Album <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Select value={uploadAlbumId} onValueChange={setUploadAlbumId} disabled={saving || albumsLoading}>
                <SelectTrigger id="memory-album"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No album</SelectItem>
                  {albums.map((album) => (
                    <SelectItem key={album.id} value={album.id}>{album.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="memory-caption">A little caption <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea id="memory-caption" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={240} disabled={saving} className="min-h-20 rounded-xl leading-7" placeholder="The kind of day you wish you could fold up and keep…" />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="memory-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea id="memory-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} disabled={saving} className="min-h-24 rounded-xl leading-7" placeholder="The story behind this moment, or the little details you want to remember." />
            </div>
            <div className="lg:col-span-2">
              <Button className="h-11 rounded-full px-5" type="submit" disabled={saving}>
                {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
                {saving ? "Keeping it close…" : "Add to memories"}
              </Button>
            </div>
          </form>

          <form className="mt-7 rounded-2xl border border-border bg-surface-muted/40 p-4 sm:p-5" onSubmit={handleCreateAlbum}>
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-dark">
                <FolderPlus className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Create an album</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.2fr_auto]">
                  <Input value={albumName} onChange={(event) => setAlbumName(event.target.value)} placeholder="Weekend away" maxLength={80} disabled={albumsSaving} className="h-10 rounded-xl bg-surface" aria-label="Album name" />
                  <Input value={albumDescription} onChange={(event) => setAlbumDescription(event.target.value)} placeholder="A tiny collection of moments" maxLength={500} disabled={albumsSaving} className="h-10 rounded-xl bg-surface" aria-label="Album description" />
                  <Button type="submit" variant="outline" className="h-10 rounded-full bg-surface" disabled={albumsSaving || !albumName.trim()}>
                    {albumsSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <FolderPlus className="size-4" aria-hidden="true" />}
                    Add
                  </Button>
                </div>
                {albumsError && <p className="mt-3 text-sm text-destructive">{albumsError}</p>}
              </div>
            </div>
          </form>

        </section>
      )}

      {(albums.length > 0 || albumsLoading) && (
        <section className="mt-10" aria-labelledby="albums-title">
          <div className="flex items-end justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Collections</p>
              <h2 id="albums-title" className="font-display mt-1 text-3xl font-semibold">Albums</h2>
            </div>
            <span className="text-sm text-muted-foreground">{albums.length} {albums.length === 1 ? "album" : "albums"}</span>
          </div>
          {albumsLoading ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading albums">
              {[1, 2, 3].map((item) => <div key={item} className="aspect-[4/3] animate-pulse rounded-card bg-surface-muted" />)}
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album) => {
                const albumMemories = memories.filter((memory) => memory.albumId === album.id);
                const cover = memories.find((memory) => memory.id === album.coverMemoryId) ?? albumMemories[0];
                return (
                  <article key={album.id} className="overflow-hidden rounded-card border border-border bg-surface">
                    <Link to={`/memories/albums/${album.id}`} className="group block">
                      <div className="aspect-[4/3] overflow-hidden bg-surface-muted">
                        {cover ? (
                          <img src={cover.thumbnailUrl || cover.url} alt={cover.caption || `${album.name} album cover`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        ) : (
                          <div className="grid h-full place-items-center text-muted-foreground"><ImagePlus className="size-8" aria-hidden="true" /></div>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold">{album.name}</h3>
                          {album.description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{album.description}</p>}
                          <p className="mt-2 text-xs text-muted-foreground">{albumMemories.length} {albumMemories.length === 1 ? "memory" : "memories"}</p>
                        </div>
                        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </div>
                    </Link>
                    {isOwner && (
                      <div className="flex items-center justify-end gap-1 border-t border-border px-3 py-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => startAlbumEdit(album)} disabled={albumsSaving}>
                          <Pencil className="size-4" aria-hidden="true" /> Edit
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => void handleRemoveAlbum(album.id)} disabled={albumsSaving} aria-label={`Remove ${album.name}`}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                    {editingAlbumId === album.id && (
                      <form className="space-y-3 border-t border-border p-4" onSubmit={handleSaveAlbum}>
                        <Label htmlFor={`album-name-${album.id}`}>Album name</Label>
                        <Input id={`album-name-${album.id}`} value={editingAlbumName} onChange={(event) => setEditingAlbumName(event.target.value)} maxLength={80} disabled={albumsSaving} />
                        <Label htmlFor={`album-description-${album.id}`}>Description</Label>
                        <Textarea id={`album-description-${album.id}`} value={editingAlbumDescription} onChange={(event) => setEditingAlbumDescription(event.target.value)} maxLength={500} disabled={albumsSaving} className="min-h-20" />
                        <Label htmlFor={`album-cover-${album.id}`}>Cover photo</Label>
                        <Select value={editingAlbumCoverId} onValueChange={setEditingAlbumCoverId} disabled={albumsSaving}>
                          <SelectTrigger id={`album-cover-${album.id}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Use first photo</SelectItem>
                            {albumMemories.map((memory) => (
                              <SelectItem key={memory.id} value={memory.id}>{memory.caption || displayDate(memory.takenAt) || "Untitled memory"}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="ghost" onClick={() => setEditingAlbumId(null)} disabled={albumsSaving}><X className="size-4" aria-hidden="true" /> Cancel</Button>
                          <Button type="submit" disabled={albumsSaving || !editingAlbumName.trim()}>
                            {albumsSaving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                            Save album
                          </Button>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
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
                  {albums.map((album) => (
                    <SelectItem key={album.id} value={album.id}>{album.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{memories.length} {memories.length === 1 ? "memory" : "memories"}</span>
            </div>
          </div>
          <Stagger className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05} >
            {memories
              .filter((m) => filterAlbum === "all" || (filterAlbum === "favorites" ? m.isFavorite : m.albumId === filterAlbum))
              .map((memory) => (
                <StaggerItem key={memory.id}>
                  <article className="card-lift group overflow-hidden rounded-card border border-border bg-surface shadow-subtle">
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
                      <button type="button" className="absolute inset-0 size-full cursor-zoom-in" onClick={() => openMemory(memory.id)} aria-label={`View memory${memory.caption ? `: ${memory.caption}` : ""}`}>
                        <img src={memory.thumbnailUrl || memory.url} alt={memory.caption || "A saved Loveline memory"} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                      </button>
                      {isOwner && (
                        <div className="absolute top-3 right-3 flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`rounded-full animate-pop-in ${memory.isFavorite ? "text-yellow-400" : "bg-black/45 text-white hover:bg-yellow-400 hover:text-black"}`}
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
                      {memory.notes && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{memory.notes}</p>}
                      {displayDate(memory.takenAt) && <p className="mt-2 text-xs text-muted-foreground">{displayDate(memory.takenAt)}</p>}
                      {memory.albumId && <p className="mt-2 text-xs text-muted-foreground">{albumById.get(memory.albumId)?.name ?? "Album"}</p>}
                      {isOwner && (
                        <div className="mt-3">
                          <Select value={memory.albumId ?? "none"} onValueChange={(value) => void updateAlbum(memory.id, value === "none" ? null : value)} disabled={saving || albumsLoading}>
                            <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No album</SelectItem>
                              {albums.map((album) => (
                                <SelectItem key={album.id} value={album.id}>{album.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </article>
                </StaggerItem>
              ))}
          </Stagger>
        </section>
      )}
      <Dialog open={Boolean(selectedMemory)} onOpenChange={(open) => { if (!open) setSelectedMemoryId(null); }}>
        {selectedMemory && (
          <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMemory.caption || "A little moment"}</DialogTitle>
              <DialogDescription>
                {[displayDate(selectedMemory.takenAt), selectedMemory.albumId ? albumById.get(selectedMemory.albumId)?.name : null].filter(Boolean).join(" · ") || "A saved Loveline memory"}
              </DialogDescription>
            </DialogHeader>
            <img src={selectedMemory.url} alt={selectedMemory.caption || "A saved Loveline memory"} className="max-h-[55vh] w-full rounded-lg bg-surface-muted object-contain" />
            {selectedMemory.caption && <p className="whitespace-pre-wrap text-sm leading-6">{selectedMemory.caption}</p>}
            {isOwner ? (
              <div className="space-y-3">
                <Label htmlFor="memory-detail-notes">Memory notes</Label>
                <Textarea id="memory-detail-notes" value={editingNotes} onChange={(event) => setEditingNotes(event.target.value)} maxLength={2000} className="min-h-28 leading-6" placeholder="Add the details you want to keep with this memory." />
                {notesError && <p className="text-sm text-destructive" role="alert">{notesError}</p>}
                {notesSaved && <p className="text-sm text-success" role="status">Memory notes saved.</p>}
                <div className="flex justify-end"><Button onClick={() => void handleSaveNotes()} disabled={notesSaving || editingNotes === selectedMemory.notes}>{notesSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}Save notes</Button></div>
              </div>
            ) : selectedMemory.notes ? (
              <div className="space-y-1"><p className="text-sm font-semibold">Notes</p><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{selectedMemory.notes}</p></div>
            ) : null}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
