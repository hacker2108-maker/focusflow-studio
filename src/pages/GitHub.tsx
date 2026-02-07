import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Github,
  Star,
  GitFork,
  ChevronRight,
  Loader2,
  Unplug,
  RefreshCw,
  AlertCircle,
  MoreVertical,
  Share2,
  Trash2,
  Pencil,
  ExternalLink,
  Plus,
  FolderPlus,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGitHubStore, type GitHubRepo } from "@/store/githubStore";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GITHUB_API = "https://api.github.com";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const OAUTH_REDIRECT = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/github-oauth` : "";

function getContributionColor(count: number): string {
  if (count === 0) return "bg-secondary";
  if (count <= 2) return "bg-emerald-400/40 dark:bg-emerald-500/30";
  if (count <= 5) return "bg-emerald-500/60 dark:bg-emerald-500/50";
  if (count <= 10) return "bg-emerald-600 dark:bg-emerald-600";
  return "bg-emerald-700 dark:bg-emerald-700";
}

function ContributionChart({ contributionMap }: { contributionMap: Record<string, number> }) {
  const { grid, totalContributions } = useMemo(() => {
    const days: { date: string; count: number; dayOfWeek: number }[] = [];
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 14 * 7);
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      days.push({ date: dateStr, count: contributionMap[dateStr] || 0, dayOfWeek: d.getDay() });
    }
    const byWeek: { date: string; count: number; dayOfWeek: number }[][] = [];
    let week: { date: string; count: number; dayOfWeek: number }[] = [];
    days.forEach((day) => {
      if (day.dayOfWeek === 0 && week.length > 0) {
        byWeek.push(week);
        week = [];
      }
      week.push(day);
    });
    if (week.length > 0) byWeek.push(week);
    return { grid: byWeek, totalContributions: Object.values(contributionMap).reduce((a, b) => a + b, 0) };
  }, [contributionMap]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {totalContributions} contribution{totalContributions !== 1 ? "s" : ""} in the last 14 weeks
      </p>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1.5 min-w-max">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                const day = week.find((d) => d.dayOfWeek === dow);
                return (
                  <div
                    key={`${wi}-${dow}`}
                    className={cn("w-5 h-5 rounded-md md:w-6 md:h-6", getContributionColor(day?.count ?? 0))}
                    title={day ? `${day.date}: ${day.count}` : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 5, 10].map((n) => (
            <div key={n} className={cn("w-4 h-4 rounded-md", getContributionColor(n))} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

function ContributionGraph({ contributionMap }: { contributionMap: Record<string, number> }) {
  const data = useMemo(() => {
    const weeks: { week: string; contributions: number }[] = [];
    const now = new Date();
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - w * 7);
      let total = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + d);
        total += contributionMap[day.toISOString().split("T")[0]] || 0;
      }
      weeks.push({ week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`, contributions: total });
    }
    return weeks;
  }, [contributionMap]);

  return (
    <div className="h-28">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(v: number) => [`${v} contributions`, "Week"]}
          />
          <Bar dataKey="contributions" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ContributionPlant({ pushesThisWeek }: { pushesThisWeek: number }) {
  const isThriving = pushesThisWeek > 0;
  return (
    <div className="relative flex flex-col items-center justify-end min-h-[140px]">
      <div className="w-16 h-12 rounded-b-2xl border-4 border-foreground/20 bg-gradient-to-b from-foreground/10 to-foreground/5" />
      <div
        className={cn(
          "w-2 rounded-full origin-bottom",
          isThriving ? "bg-emerald-600" : "bg-amber-800/60"
        )}
        style={{ height: isThriving ? 70 : 28 }}
      />
      <div className="flex gap-2 -mt-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn("rounded-full", isThriving ? "bg-emerald-500 w-5 h-3" : "bg-amber-700/50 w-4 h-2.5")}
          />
        ))}
      </div>
      <div
        className={cn(
          "mt-2 rounded-full flex items-center justify-center w-10 h-10",
          isThriving ? "bg-emerald-400 shadow-lg shadow-emerald-500/30" : "bg-amber-600/70"
        )}
      >
        {isThriving ? "🌱" : "🥀"}
      </div>
    </div>
  );
}

export default function GitHub() {
  const navigate = useNavigate();
  const {
    username,
    user,
    repos,
    pushesThisWeek,
    lastPushDate,
    contributionMap,
    accessToken,
    isLoading,
    error,
    setAccessToken,
    connectWithToken,
    fetchUserAndRepos,
    fetchWithToken,
    createRepo,
    deleteRepo,
    disconnect,
  } = useGitHubStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<GitHubRepo | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const err = params.get("error");
    if (token) {
      connectWithToken(token);
      window.history.replaceState({}, "", "/github");
    }
    if (err) {
      toast.error(decodeURIComponent(err));
      window.history.replaceState({}, "", "/github");
    }
  }, [connectWithToken]);

  useEffect(() => {
    if (accessToken && !username && !isLoading) {
      fetchWithToken();
    }
  }, [accessToken]);

  const handleConnect = () => {
    if (GITHUB_CLIENT_ID && OAUTH_REDIRECT) {
      const scope = "repo,read:user,delete_repo";
      const state = encodeURIComponent(window.location.origin);
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(OAUTH_REDIRECT)}&scope=${scope}&state=${state}`;
    } else {
      toast.error("GitHub OAuth not configured. Add a Personal Access Token in Settings → GitHub to connect.");
    }
  };

  const handleRepoClick = (repo: GitHubRepo) => {
    const [owner] = repo.full_name.split("/");
    navigate(`/github/repo/${owner}/${repo.name}`);
  };

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) {
      toast.error("Enter a repository name");
      return;
    }
    setCreateLoading(true);
    const repo = await createRepo(newRepoName.trim(), newRepoDesc.trim(), newRepoPrivate);
    setCreateLoading(false);
    if (repo) {
      toast.success("Repository created!");
      setCreateOpen(false);
      setNewRepoName("");
      setNewRepoDesc("");
      setNewRepoPrivate(false);
      const [repoOwner] = repo.full_name.split("/");
      navigate(`/github/repo/${repoOwner}/${repo.name}`);
    } else {
      toast.error("Failed to create repository");
    }
  };

  const handleDeleteRepo = async (repo: GitHubRepo) => {
    const ok = await deleteRepo(repo.full_name);
    setDeleteConfirm(null);
    if (ok) toast.success("Repository deleted");
    else toast.error("Failed to delete");
  };

  const handleShareRepo = (repo: GitHubRepo) => {
    const url = repo.html_url;
    if (navigator.share) {
      navigator.share({ title: repo.name, url, text: repo.description || "" });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  const isInactive = pushesThisWeek === 0 && username;
  const isConnected = !!username || !!accessToken;
  const hasOAuth = !!(GITHUB_CLIENT_ID && OAUTH_REDIRECT);

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 flex items-center justify-center">
              <Github className="w-6 h-6 text-background" />
            </div>
            GitHub
          </h1>
          <p className="text-muted-foreground mt-1">
            Your code garden. Push to keep it thriving.
          </p>
        </div>
      </header>

      {!isConnected ? (
        <Card className="glass overflow-hidden border-none">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col items-center text-center max-w-md mx-auto space-y-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-foreground/10 to-foreground/5 flex items-center justify-center">
                <Github className="w-12 h-12 text-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Connect your GitHub</h3>
                <p className="text-muted-foreground mt-2">
                  Authorize the app to access your repositories, contributions, and enable editing—all in one place.
                </p>
              </div>
              <Button
                size="lg"
                className="w-full max-w-sm h-14 text-base font-semibold gradient-primary"
                onClick={handleConnect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Github className="w-5 h-5 mr-2" />
                    Authorize with GitHub
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {hasOAuth ? "You'll be redirected to GitHub to authorize." : "Add a Personal Access Token in Settings → GitHub to connect."}
              </p>
              {!hasOAuth && (
                <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
                  Open Settings
                </Button>
              )}
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="glass overflow-hidden border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Contribution activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ContributionChart contributionMap={contributionMap} />
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">By week</p>
                  <ContributionGraph contributionMap={contributionMap} />
                </div>
              </CardContent>
            </Card>
            <Card
              className={cn(
                "glass overflow-hidden border-none",
                isInactive ? "border-amber-500/30 bg-amber-950/5" : "border-emerald-500/20 bg-emerald-950/5"
              )}
            >
              <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                <ContributionPlant pushesThisWeek={pushesThisWeek} />
                <div className="flex-1 text-center md:text-left space-y-2">
                  {isInactive ? (
                    <>
                      <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                        Your garden is wilting 💧
                      </p>
                      <p className="text-sm text-muted-foreground">
                        No pushes this week. Commit something to bring it back!
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                        Thriving! 🌿
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {pushesThisWeek} push{pushesThisWeek !== 1 ? "es" : ""} this week
                        {lastPushDate && (
                          <> • {formatDistanceToNow(new Date(lastPushDate), { addSuffix: true })}</>
                        )}
                      </p>
                    </>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => fetchWithToken()} disabled={isLoading}>
                      <RefreshCw className={cn("w-4 h-4 mr-1", isLoading && "animate-spin")} />
                      Refresh
                    </Button>
                    <Button variant="ghost" size="sm" onClick={disconnect}>
                      <Unplug className="w-4 h-4 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {user && (
            <Card className="glass border-none">
              <CardContent className="p-4 flex items-center gap-4">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-14 h-14 rounded-full border-2 border-border"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{user.name || user.login}</p>
                  <p className="text-sm text-muted-foreground">@{user.login}</p>
                  {user.bio && (
                    <p className="text-sm mt-1 text-muted-foreground line-clamp-2">{user.bio}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass border-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Repositories</CardTitle>
              <div className="flex gap-2">
                {accessToken && (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {repos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No repositories</p>
                  {accessToken && (
                    <Button variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>
                      Create your first repo
                    </Button>
                  )}
                </div>
              ) : (
                repos.map((repo) => (
                  <motion.div
                    key={repo.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <button
                      onClick={() => handleRepoClick(repo)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-medium truncate group-hover:text-primary">{repo.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {repo.description || "No description"}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor:
                                  repo.language === "JavaScript"
                                    ? "#f7df1e"
                                    : repo.language === "TypeScript"
                                    ? "#3178c6"
                                    : repo.language === "Python"
                                    ? "#3776ab"
                                    : "hsl(var(--muted-foreground))",
                              }}
                            />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {repo.stargazers_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3 h-3" />
                          {repo.forks_count}
                        </span>
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRepoClick(repo)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareRepo(repo)}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on GitHub
                          </a>
                        </DropdownMenuItem>
                        {accessToken && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteConfirm(repo)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create repository</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="my-awesome-repo"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="A short description"
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Private</Label>
                  <Switch checked={newRepoPrivate} onCheckedChange={setNewRepoPrivate} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRepo} disabled={createLoading}>
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete repository</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground py-4">
                Are you sure you want to delete {deleteConfirm?.name}? This cannot be undone.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => deleteConfirm && handleDeleteRepo(deleteConfirm)}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
