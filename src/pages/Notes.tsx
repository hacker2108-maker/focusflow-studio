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
  FolderPlus,
  Download,
  Share2,
  Copy,
  FolderOpen,
  X,
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNotesStore, type Note, DEFAULT_FOLDERS } from "@/store/notesStore";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { exportNoteToPdf, shareNote, copyNoteToClipboard } from "@/lib/exportPdf";

const noteColors = [
  { name: "Default", value: "#FFFFFF" },
  { name: "Yellow", value: "#FEF3C7" },
  { name: "Green", value: "#D1FAE5" },
  { name: "Blue", value: "#DBEAFE" },
  { name: "Purple", value: "#EDE9FE" },
  { name: "Pink", value: "#FCE7F3" },
  { name: "Orange", value: "#FED7AA" },
];

const folderIcons: Record<string, string> = {
  Notes: "📝",
  Work: "💼",
  Personal: "👤",
  Ideas: "💡",
  Archive: "📦",
};

export default function Notes() {
  const {
    notes,
    folders,
    selectedFolder,
    isLoading,
    selectedNote,
    fetchNotes,
    addNote,
    updateNote,
    deleteNote,
    setSelectedNote,
    togglePin,
    setSelectedFolder,
    addFolder,
    deleteFolder,
    moveToFolder,
  } = useNotesStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderSidebar, setShowFolderSidebar] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

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
    const newNote = await addNote({ title: "Untitled", content: "", folder: selectedFolder || "Notes" });
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

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim());
      toast.success(`Folder "${newFolderName}" created`);
      setNewFolderName("");
      setShowFolderDialog(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedNote) return;
    try {
      await exportNoteToPdf(selectedNote);
      toast.success("PDF export started");
    } catch (error) {
      toast.error("Failed to export PDF");
    }
  };

  const handleShare = async () => {
    if (!selectedNote) return;
    try {
      await shareNote(selectedNote);
      toast.success("Note shared");
    } catch {
      // Fallback already handled in shareNote
      try {
        await copyNoteToClipboard(selectedNote);
        toast.success("Note copied to clipboard");
      } catch {
        toast.error("Failed to share note");
      }
    }
  };

  const handleCopy = async () => {
    if (!selectedNote) return;
    try {
      await copyNoteToClipboard(selectedNote);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Filter notes by folder and search
  const filteredNotes = notes.filter((note) => {
    const matchesFolder = !selectedFolder || note.folder === selectedFolder;
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const pinnedNotes = filteredNotes.filter((note) => note.isPinned);
  const unpinnedNotes = filteredNotes.filter((note) => !note.isPinned);

  // Get note counts per folder
  const folderCounts = folders.reduce((acc, folder) => {
    acc[folder] = notes.filter((n) => n.folder === folder).length;
    return acc;
  }, {} as Record<string, number>);

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
            className="fixed inset-0 bg-background z-50 md:relative md:z-auto pb-[max(env(safe-area-inset-bottom),20px)]"
            style={{
              backgroundColor:
                selectedNote.color === "#FFFFFF" ? undefined : selectedNote.color,
            }}
          >
            {/* Editor Header */}
            <div className="sticky top-0 z-10 glass-strong border-b border-border/50 px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
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
                  {/* Folder selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Folder className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {folders.map((folder) => (
                        <DropdownMenuItem
                          key={folder}
                          onClick={() => moveToFolder(selectedNote.id, folder)}
                          className={cn(selectedNote.folder === folder && "bg-accent")}
                        >
                          <span className="mr-2">{folderIcons[folder] || "📁"}</span>
                          {folder}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

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

                  {/* Share/Export menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleShare}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopy}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to clipboard
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleExportPdf}>
                        <Download className="w-4 h-4 mr-2" />
                        Export as PDF
                      </DropdownMenuItem>
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

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(selectedNote.updatedAt, { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Folder className="w-3 h-3" />
                  <span>{selectedNote.folder}</span>
                </div>
              </div>

              <Textarea
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
                  {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
                  {selectedFolder && ` in ${selectedFolder}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFolderSidebar(!showFolderSidebar)}
                  className="md:hidden"
                >
                  <FolderOpen className="w-5 h-5" />
                </Button>
                <Button
                  onClick={handleCreateNote}
                  size="icon"
                  className="rounded-full shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </header>

            {/* Folder Sidebar (mobile slide-out) */}
            <AnimatePresence>
              {showFolderSidebar && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  className="fixed inset-0 z-50 md:hidden"
                >
                  <div
                    className="absolute inset-0 bg-black/50"
                    onClick={() => setShowFolderSidebar(false)}
                  />
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    className="absolute left-0 top-0 bottom-0 w-72 bg-background border-r border-border p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold">Folders</h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowFolderSidebar(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <FolderList
                      folders={folders}
                      selectedFolder={selectedFolder}
                      folderCounts={folderCounts}
                      onSelectFolder={(folder) => {
                        setSelectedFolder(folder);
                        setShowFolderSidebar(false);
                      }}
                      onCreateFolder={() => setShowFolderDialog(true)}
                      onDeleteFolder={deleteFolder}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Desktop folder tabs */}
            <div className="hidden md:block">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Button
                  variant={selectedFolder === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFolder(null)}
                >
                  All Notes
                </Button>
                {folders.map((folder) => (
                  <Button
                    key={folder}
                    variant={selectedFolder === folder ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFolder(folder)}
                    className="gap-1"
                  >
                    <span>{folderIcons[folder] || "📁"}</span>
                    {folder}
                    <span className="text-xs opacity-60">({folderCounts[folder] || 0})</span>
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFolderDialog(true)}
                >
                  <FolderPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

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
                          folders={folders}
                          onClick={() => setSelectedNote(note)}
                          onDelete={() => handleDeleteNote(note)}
                          onTogglePin={() => togglePin(note.id)}
                          onMoveToFolder={(folder) => moveToFolder(note.id, folder)}
                          onExportPdf={() => exportNoteToPdf(note).then(() => toast.success("PDF export started"))}
                          onCopy={() => copyNoteToClipboard(note).then(() => toast.success("Copied"))}
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
                          folders={folders}
                          onClick={() => setSelectedNote(note)}
                          onDelete={() => handleDeleteNote(note)}
                          onTogglePin={() => togglePin(note.id)}
                          onMoveToFolder={(folder) => moveToFolder(note.id, folder)}
                          onExportPdf={() => exportNoteToPdf(note).then(() => toast.success("PDF export started"))}
                          onCopy={() => copyNoteToClipboard(note).then(() => toast.success("Copied"))}
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

      {/* Create Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Folder List Component
function FolderList({
  folders,
  selectedFolder,
  folderCounts,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
}: {
  folders: string[];
  selectedFolder: string | null;
  folderCounts: Record<string, number>;
  onSelectFolder: (folder: string | null) => void;
  onCreateFolder: () => void;
  onDeleteFolder: (folder: string) => void;
}) {
  return (
    <div className="space-y-1">
      <button
        onClick={() => onSelectFolder(null)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
          selectedFolder === null ? "bg-primary/10 text-primary" : "hover:bg-secondary"
        )}
      >
        <span className="flex items-center gap-2">
          <span>📋</span>
          All Notes
        </span>
        <span className="text-xs text-muted-foreground">
          {Object.values(folderCounts).reduce((a, b) => a + b, 0)}
        </span>
      </button>

      {folders.map((folder) => (
        <div
          key={folder}
          className={cn(
            "flex items-center justify-between px-3 py-2 rounded-lg transition-colors group",
            selectedFolder === folder ? "bg-primary/10 text-primary" : "hover:bg-secondary"
          )}
        >
          <button
            onClick={() => onSelectFolder(folder)}
            className="flex-1 flex items-center gap-2 text-left"
          >
            <span>{folderIcons[folder] || "📁"}</span>
            {folder}
          </button>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{folderCounts[folder] || 0}</span>
            {!DEFAULT_FOLDERS.includes(folder) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => onDeleteFolder(folder)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={onCreateFolder}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
      >
        <FolderPlus className="w-4 h-4" />
        New Folder
      </button>
    </div>
  );
}

// Note Card Component
function NoteCard({
  note,
  folders,
  onClick,
  onDelete,
  onTogglePin,
  onMoveToFolder,
  onExportPdf,
  onCopy,
}: {
  note: Note;
  folders: string[];
  onClick: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onMoveToFolder: (folder: string) => void;
  onExportPdf: () => void;
  onCopy: () => void;
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
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Folder className="w-3 h-3" />
                  {note.folder}
                </span>
                <span>•</span>
                <span>{formatDistanceToNow(note.updatedAt, { addSuffix: true })}</span>
              </div>
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
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                    <Folder className="w-4 h-4 mr-2" />
                    Move to folder
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {folders.map((folder) => (
                      <DropdownMenuItem
                        key={folder}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveToFolder(folder);
                        }}
                        className={cn(note.folder === folder && "bg-accent")}
                      >
                        <span className="mr-2">{folderIcons[folder] || "📁"}</span>
                        {folder}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy();
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onExportPdf();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
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
