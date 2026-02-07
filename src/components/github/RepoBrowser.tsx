import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  FolderOpen,
  FileCode,
  File,
  Copy,
  Share2,
  Loader2,
  ArrowLeft,
  Save,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGitHubStore, type GitHubRepo } from "@/store/githubStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GITHUB_API = "https://api.github.com";

interface GitHubContentItem {
  name: string;
  path: string;
  type: "dir" | "file";
  sha?: string;
}

function getAuthHeaders(accessToken: string | null): HeadersInit {
  const headers: HeadersInit = { Accept: "application/vnd.github.raw" };
  if (accessToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
}

function getJsonHeaders(accessToken: string | null): HeadersInit {
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };
  if (accessToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
}

const TEXT_EXTENSIONS = [
  "md", "txt", "js", "ts", "tsx", "jsx", "json", "css", "scss", "html", "xml",
  "py", "rb", "go", "rs", "java", "kt", "swift", "c", "cpp", "h", "yaml", "yml",
  "sql", "sh", "bash", "env", "gitignore", "dockerfile",
];

function isTextFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase();
  return !ext || TEXT_EXTENSIONS.includes(ext) || name.startsWith(".");
}

export function RepoBrowser({
  repo,
  open,
  onOpenChange,
}: {
  repo: GitHubRepo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { accessToken } = useGitHubStore();
  const [path, setPath] = useState<string[]>([]);
  const [contents, setContents] = useState<GitHubContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentPath = path.length ? path.join("/") : "";
  const fetchContents = useCallback(
    async (dirPath: string) => {
      if (!repo) return;
      setLoading(true);
      try {
        const url = dirPath
          ? `${GITHUB_API}/repos/${repo.full_name}/contents/${dirPath}`
          : `${GITHUB_API}/repos/${repo.full_name}/contents`;
        const res = await fetch(url, { headers: getJsonHeaders(accessToken) });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const items: GitHubContentItem[] = Array.isArray(data)
          ? data.map((c: { name: string; path: string; type: string; sha?: string }) => ({
              name: c.name,
              path: c.path,
              type: c.type as "dir" | "file",
              sha: c.sha,
            }))
          : [];
        items.sort((a, b) => {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setContents(items);
      } catch {
        toast.error("Failed to load directory");
        setContents([]);
      } finally {
        setLoading(false);
      }
    },
    [repo, accessToken]
  );

  useEffect(() => {
    if (!open || !repo) return;
    setPath([]);
    setSelectedFile(null);
    setEditedContent(null);
  }, [open, repo?.id]);

  useEffect(() => {
    if (open && repo) fetchContents(currentPath);
  }, [currentPath, open, repo?.id, fetchContents]);

  const handleItemClick = async (item: GitHubContentItem) => {
    if (item.type === "dir") {
      setPath([...path, item.name]);
      setSelectedFile(null);
    } else {
      setFileLoading(true);
      setSelectedFile(null);
      try {
        const url = `${GITHUB_API}/repos/${repo!.full_name}/contents/${item.path}`;
        const res = await fetch(url, { headers: getAuthHeaders(accessToken) });
        if (!res.ok) throw new Error("Failed to fetch file");
        const text = await res.text();
        setSelectedFile({ path: item.path, content: text });
        setEditedContent(null);
      } catch {
        toast.error("Could not load file. It may be binary.");
      } finally {
        setFileLoading(false);
      }
    }
  };

  const handleCopy = () => {
    const text = editedContent ?? selectedFile?.content ?? "";
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleShare = async () => {
    const shareUrl = repo ? `https://github.com/${repo.full_name}/blob/main/${selectedFile?.path || ""}` : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${repo?.name} - ${selectedFile?.path || "Repository"}`,
          url: shareUrl,
          text: editedContent ?? selectedFile?.content,
        });
        toast.success("Shared!");
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied to clipboard");
        }
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    }
  };

  const handleSave = async () => {
    if (!repo || !selectedFile || !accessToken || editedContent === null) return;
    setSaving(true);
    try {
      const res = await fetch(`${GITHUB_API}/repos/${repo.full_name}/contents/${selectedFile.path}`, {
        method: "PUT",
        headers: {
          ...getJsonHeaders(accessToken),
          "Content-Type": "application/json",
        } as HeadersInit,
        body: JSON.stringify({
          message: `Update ${selectedFile.path}`,
          content: btoa(unescape(encodeURIComponent(editedContent))),
          sha: await getFileSha(repo.full_name, selectedFile.path, accessToken),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save");
      }
      setSelectedFile({ ...selectedFile, content: editedContent });
      setEditedContent(null);
      toast.success("File saved!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (path.length > 0) {
      setPath(path.slice(0, -1));
      setSelectedFile(null);
    }
  };

  const hasEdits = editedContent !== null;
  const isMarkdown = selectedFile?.path.toLowerCase().endsWith(".md");

  if (!repo) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 p-3 border-b shrink-0 flex-wrap">
        <Button variant="ghost" size="sm" onClick={path.length ? goBack : () => onOpenChange(false)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1 overflow-x-auto text-sm">
          <button
            onClick={() => {
              setPath([]);
              setSelectedFile(null);
            }}
            className="text-primary hover:underline truncate"
          >
            {repo.name}
          </button>
          {path.map((p, i) => (
            <span key={p} className="flex items-center gap-1 truncate">
              <span className="text-muted-foreground">/</span>
              <button
                onClick={() => {
                  setPath(path.slice(0, i + 1));
                  setSelectedFile(null);
                }}
                className="text-primary hover:underline truncate max-w-[80px]"
              >
                {p}
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* File tree */}
        <div className="w-64 border-r shrink-0 flex flex-col">
          <div className="p-2 border-b text-xs font-medium text-muted-foreground">Files</div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {loading ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                contents.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm hover:bg-secondary/80",
                      selectedFile?.path === item.path && "bg-secondary"
                    )}
                  >
                    {item.type === "dir" ? (
                      <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
                    ) : (
                      <File className="w-4 h-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{item.name}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* File content */}
        <div className="flex-1 flex flex-col min-w-0">
          {fileLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedFile ? (
            <>
              <div className="flex items-center gap-2 p-2 border-b shrink-0">
                <FileCode className="w-4 h-4" />
                <span className="text-sm font-medium truncate">{selectedFile.path}</span>
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  {accessToken && isTextFile(selectedFile.path) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSave}
                      disabled={!hasEdits || saving}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : hasEdits ? (
                        <Save className="w-4 h-4 text-primary" />
                      ) : (
                        <Check className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {isMarkdown ? (
                    <div
                      className={cn(
                        "prose prose-sm dark:prose-invert max-w-none",
                        hasEdits && "outline-none"
                      )}
                    >
                      {hasEdits ? (
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="w-full min-h-[200px] p-4 rounded-lg bg-secondary/30 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                          spellCheck={false}
                        />
                      ) : (
                        <ReactMarkdown>{selectedFile.content}</ReactMarkdown>
                      )}
                    </div>
                  ) : isTextFile(selectedFile.path) ? (
                    hasEdits ? (
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full min-h-[400px] p-4 rounded-lg bg-secondary/30 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        spellCheck={false}
                      />
                    ) : (
                      <pre className="text-sm font-mono overflow-x-auto p-4 rounded-lg bg-secondary/30">
                        <code>{selectedFile.content}</code>
                      </pre>
                    )
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Binary file. Open on GitHub to view.
                    </p>
                  )}
                  {!hasEdits && isTextFile(selectedFile.path) && accessToken && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setEditedContent(selectedFile.content)}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Edit file
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <FileCode className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">Select a file to view</p>
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Open on GitHub
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function getFileSha(
  fullName: string,
  filePath: string,
  token: string | null
): Promise<string | undefined> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${fullName}/contents/${filePath}`, {
      headers: getJsonHeaders(token),
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.sha;
  } catch {
    return undefined;
  }
}
