import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Pin,
  Trash2,
  MoreVertical,
  Folder,
  ChevronLeft,
  Clock,
  FileText,
  PinOff,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNotesStore, type Note } from "@/store/notesStore";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const noteColors = [
  { name: "Default", value: "#FFFFFF" },
  { name: "Yellow", value: "#FEF3C7" },
  { name: "Green", value: "#D1FAE5" },
  { name: "Blue", value: "#DBEAFE" },
  { name: "Purple", value: "#EDE9FE" },
  { name: "Pink", value: "#FCE7F3" },
  { name: "Orange", value: "#FED7AA" },
];

export default function Notes() {
  const {
    notes,
    isLoading,
    selectedNote,
    fetchNotes,
    addNote,
    updateNote,
    deleteNote,
    setSelectedNote,
    togglePin,
  } = useNotesStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setIsEditing(true);
    }
  }, [selectedNote]);

  // Auto-save with debounce
  useEffect(() => {
    if (!selectedNote || !isEditing) return;

    const timer = setTimeout(() => {
      if (editTitle !== selectedNote.title || editContent !== selectedNote.content) {
        updateNote(selectedNote.id, { title: editTitle, content: editContent });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [editTitle, editContent, selectedNote, isEditing, updateNote]);

  const handleCreateNote = async () => {
    const newNote = await addNote({ title: "Untitled", content: "" });
    if (newNote) {
      setSelectedNote(newNote);
      setIsEditing(true);
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  };

  const handleDeleteNote = async (note: Note) => {
    await deleteNote(note.id);
    toast.success("Note deleted");
    if (selectedNote?.id === note.id) {
      setSelectedNote(null);
      setIsEditing(false);
    }
  };

  const handleBack = () => {
    setSelectedNote(null);
    setIsEditing(false);
  };

  const handleColorChange = (color: string) => {
    if (selectedNote) {
      updateNote(selectedNote.id, { color });
    }
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedNotes = filteredNotes.filter((note) => note.isPinned);
  const unpinnedNotes = filteredNotes.filter((note) => !note.isPinned);

  // Determine if we should show mobile editor view
  const showMobileEditor = selectedNote && isEditing;

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {showMobileEditor ? (
          // Mobile Editor View
          <motion.div
            key="editor"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-background z-50 md:relative md:z-auto"
            style={{
              backgroundColor:
                selectedNote.color === "#FFFFFF" ? undefined : selectedNote.color,
            }}
          >
            {/* Editor Header */}
            <div className="sticky top-0 z-10 glass-strong border-b border-border/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="gap-1 -ml-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="md:hidden">Notes</span>
                </Button>

                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Palette className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <div className="grid grid-cols-4 gap-2 p-2">
                        {noteColors.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => handleColorChange(color.value)}
                            className={cn(
                              "w-8 h-8 rounded-full border-2 transition-all",
                              selectedNote.color === color.value
                                ? "border-primary scale-110"
                                : "border-border/50 hover:scale-105"
                            )}
                            style={{ backgroundColor: color.value }}
                          />
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePin(selectedNote.id)}
                  >
                    {selectedNote.isPinned ? (
                      <PinOff className="w-4 h-4" />
                    ) : (
                      <Pin className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteNote(selectedNote)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Editor Content */}
            <div className="p-4 space-y-4">
              <Input
                ref={titleRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
                className="text-xl font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
              />

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(selectedNote.updatedAt, { addSuffix: true })}
                </span>
              </div>

              <Textarea
                ref={contentRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Start typing..."
                className="min-h-[60vh] border-none bg-transparent p-0 resize-none focus-visible:ring-0 text-base leading-relaxed placeholder:text-muted-foreground/50"
              />
            </div>
          </motion.div>
        ) : (
          // Notes List View
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6 animate-fade-in"
          >
            {/* Header */}
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-display-sm bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Notes
                </h1>
                <p className="text-muted-foreground mt-1">
                  {notes.length} {notes.length === 1 ? "note" : "notes"}
                </p>
              </div>
              <Button
                onClick={handleCreateNote}
                size="icon"
                className="rounded-full shadow-lg"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </header>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="pl-10"
              />
            </div>

            {/* Notes Grid */}
            {isLoading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="glass animate-pulse h-32" />
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="font-medium text-lg">No notes yet</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Tap the + button to create your first note
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Pinned Notes */}
                {pinnedNotes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium px-1">
                      <Pin className="w-3 h-3" />
                      PINNED
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {pinnedNotes.map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          onClick={() => setSelectedNote(note)}
                          onDelete={() => handleDeleteNote(note)}
                          onTogglePin={() => togglePin(note.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Notes */}
                {unpinnedNotes.length > 0 && (
                  <div className="space-y-2">
                    {pinnedNotes.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium px-1">
                        <Folder className="w-3 h-3" />
                        NOTES
                      </div>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      {unpinnedNotes.map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          onClick={() => setSelectedNote(note)}
                          onDelete={() => handleDeleteNote(note)}
                          onTogglePin={() => togglePin(note.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Note Card Component
function NoteCard({
  note,
  onClick,
  onDelete,
  onTogglePin,
}: {
  note: Note;
  onClick: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card
        className={cn(
          "glass border-none cursor-pointer overflow-hidden",
          "hover:shadow-lg transition-all"
        )}
        style={{
          backgroundColor: note.color === "#FFFFFF" ? undefined : note.color,
        }}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{note.title || "Untitled"}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {note.content || "No content"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin();
                  }}
                >
                  {note.isPinned ? (
                    <>
                      <PinOff className="w-4 h-4 mr-2" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="w-4 h-4 mr-2" />
                      Pin
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
