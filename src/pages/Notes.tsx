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
  Briefcase,
  User,
  Lightbulb,
  Archive,
  FileStack,
  Mic,
  MicOff,
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
  { name: "Light Gray", value: "#F5F5F5" },
  { name: "Gray", value: "#E5E5E5" },
  { name: "Warm White", value: "#FAFAFA" },
  { name: "Cool Gray", value: "#F4F4F5" },
  { name: "Soft White", value: "#FAFAF9" },
  { name: "Off White", value: "#F8F8F8" },
];

const folderIcons: Record<string, React.ElementType> = {
  Notes: FileText,
  Work: Briefcase,
  Personal: User,
  Ideas: Lightbulb,
  Archive: Archive,
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
  const [isListening, setIsListening] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<InstanceType<typeof window.SpeechRecognition> | null>(null);
  const contentRef = useRef("");

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Only sync from store when switching notes (by id), NOT when store updates from our own save.
  // This prevents the typing bug where words get deleted as the debounced save overwrites edit state.
  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setIsEditing(true);
    } else {
      setEditTitle("");
      setEditContent("");
      setIsEditing(false);
    }
  }, [selectedNote?.id]);

  // Keep content ref in sync for voice input so we always append to latest text
  useEffect(() => {
    contentRef.current = editContent;
  }, [editContent]);

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

  // Voice-to-text: Web Speech API (Chrome, Edge, Safari)
  const isSpeechRecognitionSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const toggleVoiceInput = () => {
    const Win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    const SpeechRecognitionAPI = Win.SpeechRecognition || Win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      toast.error("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang || "en-US";
    recognition.maxAlternatives = 1;

    const onResult = (event: SpeechRecognitionEvent) => {
      if (!event.results || event.results.length === 0) return;
      const results = event.results;
      let toAppend = "";
      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i];
        if (!result.isFinal) continue;
        if (result.length > 0 && result[0].transcript) {
          toAppend += (toAppend ? " " : "") + result[0].transcript;
        }
      }
      if (toAppend) {
        const current = contentRef.current ?? "";
        const newContent = current.trimEnd() ? current + " " + toAppend.trim() : toAppend.trim();
        contentRef.current = newContent;
        setEditContent(newContent);
      }
    };

    const onError = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Allow mic access to use voice notes.");
      } else if (event.error === "no-speech") {
        toast.info("No speech heard. Try again or check your microphone.");
      } else if (event.error !== "aborted") {
        toast.error("Voice input error: " + (event.error || "Try again."));
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    const onEnd = () => {
      if (recognitionRef.current === recognition) {
        setIsListening(false);
        recognitionRef.current = null;
      }
    };

    recognition.addEventListener("result", onResult);
    recognition.addEventListener("error", onError);
    recognition.addEventListener("end", onEnd);

    const startListening = () => {
      try {
        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
        toast.success("Listening… Speak now to add to your note.");
      } catch (err) {
        recognition.removeEventListener("result", onResult);
        recognition.removeEventListener("error", onError);
        recognition.removeEventListener("end", onEnd);
        toast.error("Could not start microphone. Allow mic access and try again.");
        setIsListening(false);
      }
    };

    // Request mic permission first so the prompt appears and recognition is more reliable
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((t) => t.stop());
          startListening();
        })
        .catch(() => {
          toast.error("Microphone access is required for voice notes. Please allow and try again.");
        });
    } else {
      startListening();
    }
  };

  // Cleanup voice recognition on unmount or when leaving editor
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
    };
  }, []);

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
            className="fixed inset-0 z-50 md:left-64 md:pt-0 flex flex-col bg-background pb-[max(env(safe-area-inset-bottom),20px)]"
            style={{
              backgroundColor:
                selectedNote.color === "#FFFFFF" ? undefined : selectedNote.color,
            }}
          >
            {/* Editor Header */}
            <div className="flex-shrink-0 sticky top-0 z-10 glass-strong border-b border-border/50 px-4 py-3 pt-[max(env(safe-area-inset-top),12px)] md:pt-4">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
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

                  {/* Voice input */}
                  {isSpeechRecognitionSupported && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleVoiceInput}
                      className={cn(
                        "relative",
                        isListening && "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      )}
                      title={isListening ? "Stop voice input" : "Take notes by voice"}
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                      {isListening && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      )}
                    </Button>
                  )}

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
                                ? "border-foreground scale-110"
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

            {/* Document-style content: readable width, no cramped “circle” feel */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-8">
                <Input
                  ref={titleRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title"
                  className="text-2xl md:text-3xl font-semibold border-none bg-transparent p-0 h-auto min-h-[2.5rem] focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none outline-none shadow-none rounded-none placeholder:text-muted-foreground/50 w-full"
                />

                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDistanceToNow(selectedNote.updatedAt, { addSuffix: true })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5" />
                    {selectedNote.folder}
                  </span>
                </div>

                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Start typing..."
                  className="mt-6 min-h-[50vh] md:min-h-[60vh] w-full border-none bg-transparent p-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none outline-none shadow-none rounded-none text-base md:text-[17px] leading-[1.6] placeholder:text-muted-foreground/50"
                />
              </div>
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
            {/* Header - Apple Notes style */}
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                  Notes
                </h1>
                <p className="text-muted-foreground mt-0.5 text-sm">
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
                  className="rounded-full bg-foreground text-background hover:bg-foreground/90"
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
                    {(function() {
                      const Icon = folderIcons[folder] || Folder;
                      return <Icon className="w-4 h-4" />;
                    })()}
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
          <FileStack className="w-4 h-4" />
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
            {(function() {
              const Icon = folderIcons[folder] || Folder;
              return <Icon className="w-4 h-4" />;
            })()}
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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card
        className={cn(
          "border border-border cursor-pointer overflow-hidden rounded-xl",
          "hover:bg-muted/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
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
                        {(function() {
                          const Icon = folderIcons[folder] || Folder;
                          return <Icon className="w-4 h-4 mr-2" />;
                        })()}
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
