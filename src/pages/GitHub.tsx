import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Github,
  Star,
  GitFork,
  ChevronRight,
  Loader2,
  Unplug,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RepoBrowser } from "@/components/github/RepoBrowser";
import { useGitHubStore, type GitHubRepo } from "@/store/githubStore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const GITHUB_API = "https://api.github.com";

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
      days.push({
        date: dateStr,
        count: contributionMap[dateStr] || 0,
        dayOfWeek: d.getDay(),
      });
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

    const totalContributions = Object.values(contributionMap).reduce((a, b) => a + b, 0);
    return { grid: byWeek, totalContributions };
  }, [contributionMap]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalContributions} contribution{totalContributions !== 1 ? "s" : ""} in the last 14 weeks
        </p>
      </div>
      <div className="overflow-x-auto pb-2 -mx-2">
        <div className="flex gap-1.5 min-w-max">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                const day = week.find((d) => d.dayOfWeek === dow);
                const count = day?.count ?? 0;
                return (
                  <motion.div
                    key={`${wi}-${dow}`}
                    className={cn(
                      "w-5 h-5 rounded-md min-w-[20px] min-h-[20px] md:w-6 md:h-6 md:min-w-[24px] md:min-h-[24px]",
                      getContributionColor(count)
                    )}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (wi * 7 + dow) * 0.003 }}
                    title={day ? `${day.date}: ${count} contributions` : undefined}
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
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      let total = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + d);
        const dateStr = day.toISOString().split("T")[0];
        total += contributionMap[dateStr] || 0;
      }
      weeks.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        contributions: total,
      });
    }
    return weeks;
  }, [contributionMap]);

  return (
    <div className="h-32">
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
            formatter={(value: number) => [`${value} contributions`, "Week"]}
          />
          <Bar
            dataKey="contributions"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            opacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ContributionPlant({ pushesThisWeek }: { pushesThisWeek: number }) {
  const isThriving = pushesThisWeek > 0;
  const healthLevel = Math.min(pushesThisWeek, 5);

  return (
    <div className="relative flex flex-col items-center justify-end min-h-[160px]">
      <div className="w-20 h-14 rounded-b-2xl border-4 border-foreground/20 bg-gradient-to-b from-foreground/10 to-foreground/5" />
      <motion.div
        className={cn(
          "w-2 rounded-full origin-bottom",
          isThriving ? "bg-emerald-600" : "bg-amber-800/60"
        )}
        animate={{ height: isThriving ? 60 + healthLevel * 12 : 32 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      />
      <div className="flex gap-2 -mt-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn(
              "rounded-full",
              isThriving ? "bg-emerald-500" : "bg-amber-700/50"
            )}
            animate={{
              scale: isThriving ? 1 : 0.6,
              width: isThriving ? 20 : 16,
              height: isThriving ? 14 : 10,
            }}
          />
        ))}
      </div>
      <motion.div
        className={cn(
          "mt-2 rounded-full flex items-center justify-center",
          isThriving ? "bg-emerald-400 shadow-lg shadow-emerald-500/30" : "bg-amber-600/70"
        )}
        animate={{ scale: isThriving ? 1.1 : 0.8 }}
        style={{ width: 40, height: 40 }}
      >
        {isThriving ? (
          <span className="text-xl">🌱</span>
        ) : (
          <span className="text-xl opacity-80">🥀</span>
        )}
      </motion.div>
      {!isThriving && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-900/15 rounded-full blur-2xl animate-pulse" />
        </div>
      )}
    </div>
  );
}

export default function GitHub() {
  const {
    username,
    user,
    repos,
    pushesThisWeek,
    lastPushDate,
    contributionMap,
    isLoading,
    error,
    fetchUserAndRepos,
    disconnect,
  } = useGitHubStore();

  const [inputUsername, setInputUsername] = useState(username || "");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [repoViewerOpen, setRepoViewerOpen] = useState(false);

  const handleConnect = () => {
    const trimmed = inputUsername.trim();
    if (trimmed) fetchUserAndRepos(trimmed);
  };

  const handleRepoClick = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setRepoViewerOpen(true);
  };

  const isInactive = pushesThisWeek === 0 && username;

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <header>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Github className="w-8 h-8" />
              GitHub
            </h1>
            <p className="text-muted-foreground mt-1">
              Your code garden. Push to keep it thriving.
            </p>
          </div>
        </div>
      </header>

      {!username ? (
        <Card className="glass overflow-hidden border-none">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-secondary/80 flex items-center justify-center mx-auto">
                <Github className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Connect your GitHub</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your username to see repos and track your coding activity
                </p>
              </div>
              <div className="flex gap-2 max-w-sm mx-auto">
                <Input
                  placeholder="GitHub username"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  className="flex-1"
                />
                <Button onClick={handleConnect} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
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
          {/* Contribution activity */}
          <Card className="glass overflow-hidden border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Contribution activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ContributionChart contributionMap={contributionMap} />
              <div>
                <p className="text-sm font-medium mb-2">Contributions per week</p>
                <ContributionGraph contributionMap={contributionMap} />
              </div>
            </CardContent>
          </Card>

          {/* Contribution plant */}
          <Card
            className={cn(
              "glass overflow-hidden border-none transition-all duration-500",
              isInactive ? "border-amber-500/30 bg-amber-950/5" : "border-emerald-500/20 bg-emerald-950/5"
            )}
          >
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <ContributionPlant pushesThisWeek={pushesThisWeek} />
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                  <AnimatePresence mode="wait">
                    {isInactive ? (
                      <motion.div
                        key="inactive"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <p className="text-xl font-semibold text-amber-700 dark:text-amber-400">
                          Your code garden is wilting 💧
                        </p>
                        <p className="text-muted-foreground">
                          No pushes in the last 7 days. Commit something to bring it back to life!
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="active"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-400">
                          Thriving! 🌿
                        </p>
                        <p className="text-muted-foreground">
                          {pushesThisWeek} push{pushesThisWeek !== 1 ? "es" : ""} this week
                          {lastPushDate && (
                            <> • Last push {formatDistanceToNow(new Date(lastPushDate), { addSuffix: true })}</>
                          )}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex gap-2 mt-4 justify-center md:justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchUserAndRepos(username)}
                      disabled={isLoading}
                    >
                      <RefreshCw className={cn("w-4 h-4 mr-1", isLoading && "animate-spin")} />
                      Refresh
                    </Button>
                    <Button variant="ghost" size="sm" onClick={disconnect}>
                      <Unplug className="w-4 h-4 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User profile */}
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

          {/* Repositories */}
          <Card className="glass border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                Your Repositories
                <span className="text-xs text-muted-foreground font-normal">{repos.length} repos</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Tap to browse, view, edit and share in app</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {repos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Github className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No public repositories found</p>
                </div>
              ) : (
                repos.slice(0, 20).map((repo) => (
                  <motion.button
                    key={repo.id}
                    onClick={() => handleRepoClick(repo)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group text-left"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate group-hover:text-primary">
                        {repo.name}
                      </p>
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
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </motion.button>
                ))
              )}
            </CardContent>
          </Card>

          <Sheet open={repoViewerOpen} onOpenChange={setRepoViewerOpen}>
            <SheetContent
              side="right"
              className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl p-0 flex flex-col h-full"
            >
              <RepoBrowser
                repo={selectedRepo}
                open={repoViewerOpen}
                onOpenChange={setRepoViewerOpen}
              />
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
