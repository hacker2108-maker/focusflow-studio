import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  private: boolean;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
}

// date string (YYYY-MM-DD) -> contribution count
export type ContributionMap = Record<string, number>;

interface GitHubStore {
  username: string | null;
  user: GitHubUser | null;
  repos: GitHubRepo[];
  pushesThisWeek: number;
  lastPushDate: string | null;
  contributionMap: ContributionMap;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  setUsername: (username: string | null) => void;
  setAccessToken: (token: string | null) => void;
  fetchUserAndRepos: (username: string) => Promise<void>;
  connectFromOAuthToken: (token: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshFromCommits: () => Promise<boolean>;
  refreshContributions: () => Promise<{ ok: boolean; count: number }>;
  createRepo: (name: string, description?: string, isPrivate?: boolean) => Promise<GitHubRepo | null>;
  deleteRepo: (fullName: string) => Promise<boolean>;
  disconnect: () => void | Promise<void>;
  syncFromSupabase: () => Promise<void>;
}

const GITHUB_API = "https://api.github.com";

export const useGitHubStore = create<GitHubStore>()(
  persist(
    (set, get) => ({
      username: null,
      user: null,
      repos: [],
      pushesThisWeek: 0,
      lastPushDate: null,
      contributionMap: {},
      accessToken: null,
      isLoading: false,
      error: null,

      setUsername: (username) => set({ username }),
      setAccessToken: (token) => set({ accessToken: token }),

      fetchUserAndRepos: async (username: string) => {
        set({ isLoading: true, error: null });
        try {
          const [userRes, reposRes, eventsRes] = await Promise.all([
            fetch(`${GITHUB_API}/users/${username}`),
            fetch(`${GITHUB_API}/users/${username}/repos?sort=updated&per_page=100`),
            fetch(`${GITHUB_API}/users/${username}/events?per_page=100`),
          ]);

          if (!userRes.ok) {
            if (userRes.status === 404) throw new Error("User not found");
            throw new Error("Failed to fetch GitHub data");
          }

          const [user, repos, events] = await Promise.all([
            userRes.json(),
            reposRes.json(),
            eventsRes.json(),
          ]);

          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          let pushesThisWeek = 0;
          let lastPushDate: string | null = null;
          const contributionMap: ContributionMap = {};

          for (const event of events) {
            if (event.type === "PushEvent") {
              const eventDate = new Date(event.created_at);
              const dateStr = eventDate.toISOString().split("T")[0];
              const count = event.payload?.size ?? event.payload?.commits?.length ?? 1;
              contributionMap[dateStr] = (contributionMap[dateStr] || 0) + count;
              if (eventDate >= oneWeekAgo) {
                pushesThisWeek++;
              }
              if (!lastPushDate || eventDate > new Date(lastPushDate)) {
                lastPushDate = event.created_at;
              }
            }
          }

          set({
            username,
            user,
            repos,
            pushesThisWeek,
            lastPushDate,
            contributionMap,
            isLoading: false,
            error: null,
          });

          // Sync to Supabase Storage for cross-device (phone/laptop) - uses existing avatars bucket
          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
              const payload = { username, user, repos, pushesThisWeek, lastPushDate, contributionMap };
              await supabase.storage
                .from("avatars")
                .upload(`${authUser.id}/github-sync.json`, JSON.stringify(payload), {
                  contentType: "application/json",
                  upsert: true,
                });
            }
          } catch {
            // Ignore storage errors - app works with localStorage fallback
          }
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : "Something went wrong",
          });
        }
      },

      connectFromOAuthToken: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          const [userRes, reposRes, eventsRes] = await Promise.all([
            fetch(`${GITHUB_API}/user`, {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
            }),
            fetch(`${GITHUB_API}/user/repos?sort=updated&per_page=100`, {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
            }),
            fetch(`${GITHUB_API}/user/events?per_page=100`, {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
            }),
          ]);

          if (!userRes.ok) throw new Error("Failed to fetch GitHub data");

          const [user, repos, events] = await Promise.all([
            userRes.json(),
            reposRes.json(),
            eventsRes.json(),
          ]);

          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          let pushesThisWeek = 0;
          let lastPushDate: string | null = null;
          const contributionMap: ContributionMap = {};

          for (const event of events) {
            if (event.type === "PushEvent") {
              const eventDate = new Date(event.created_at);
              const dateStr = eventDate.toISOString().split("T")[0];
              const count = event.payload?.size ?? event.payload?.commits?.length ?? 1;
              contributionMap[dateStr] = (contributionMap[dateStr] || 0) + count;
              if (eventDate >= oneWeekAgo) {
                pushesThisWeek++;
              }
              if (!lastPushDate || eventDate > new Date(lastPushDate)) {
                lastPushDate = event.created_at;
              }
            }
          }

          set({
            username: user.login,
            user,
            repos,
            pushesThisWeek,
            lastPushDate,
            contributionMap,
            accessToken: token,
            isLoading: false,
            error: null,
          });

          // Sync to Supabase Storage for cross-device
          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
              const payload = { username: user.login, user, repos, pushesThisWeek, lastPushDate, contributionMap };
              await supabase.storage
                .from("avatars")
                .upload(`${authUser.id}/github-sync.json`, JSON.stringify(payload), {
                  contentType: "application/json",
                  upsert: true,
                });
            }
          } catch {
            // Ignore storage errors
          }
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : "Failed to connect GitHub",
          });
        }
      },

      refreshEvents: async () => {
        const { username, accessToken } = get();
        if (!username) return;
        try {
          const url = accessToken
            ? `${GITHUB_API}/user/events?per_page=100`
            : `${GITHUB_API}/users/${username}/events?per_page=100`;
          const headers: HeadersInit = { Accept: "application/vnd.github+json" };
          if (accessToken) (headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;

          const eventsRes = await fetch(url, { headers });
          if (!eventsRes.ok) return;

          const events = await eventsRes.json();
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          let pushesThisWeek = 0;
          let lastPushDate: string | null = null;
          const contributionMap: ContributionMap = {};

          for (const event of events) {
            if (event.type === "PushEvent") {
              const eventDate = new Date(event.created_at);
              const dateStr = eventDate.toISOString().split("T")[0];
              const count = event.payload?.size ?? event.payload?.commits?.length ?? 1;
              contributionMap[dateStr] = (contributionMap[dateStr] || 0) + count;
              if (eventDate >= oneWeekAgo) pushesThisWeek++;
              if (!lastPushDate || eventDate > new Date(lastPushDate)) lastPushDate = event.created_at;
            }
          }

          set({ pushesThisWeek, lastPushDate, contributionMap });

          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
              const s = get();
              const payload = {
                username: s.username,
                user: s.user,
                repos: s.repos,
                pushesThisWeek,
                lastPushDate,
                contributionMap,
              };
              await supabase.storage.from("avatars").upload(`${authUser.id}/github-sync.json`, JSON.stringify(payload), {
                contentType: "application/json",
                upsert: true,
              });
            }
          } catch {
            // Ignore storage errors
          }
        } catch {
          // Silent fail - don't disrupt UX
        }
      },

      // Commits API is real-time (Events API has 30s–6h delay). Use when we have repos.
      refreshFromCommits: async () => {
        const { username, repos, accessToken } = get();
        if (!username || !repos.length) return false;
        try {
          const since = new Date();
          since.setDate(since.getDate() - 14 * 7);
          const sinceISO = since.toISOString();
          const headers: HeadersInit = { Accept: "application/vnd.github+json" };
          if (accessToken) (headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;

          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          const contributionMap: ContributionMap = {};
          let lastPushDate: string | null = null;
          let pushesThisWeek = 0;

          const reposToFetch = repos.slice(0, 20);
          const results = await Promise.all(
            reposToFetch.map((repo) =>
              fetch(
                `${GITHUB_API}/repos/${repo.full_name}/commits?since=${sinceISO}&per_page=100`,
                { headers }
              )
            )
          );

          for (const res of results) {
            if (!res.ok) continue;
            const commits = await res.json();
            if (!Array.isArray(commits)) continue;
            for (const c of commits) {
              const commit = c.commit;
              const date = commit?.author?.date || commit?.committer?.date;
              if (!date) continue;
              const eventDate = new Date(date);
              const dateStr = eventDate.toISOString().split("T")[0];
              contributionMap[dateStr] = (contributionMap[dateStr] || 0) + 1;
              if (eventDate >= oneWeekAgo) pushesThisWeek++;
              if (!lastPushDate || eventDate > new Date(lastPushDate)) lastPushDate = date;
            }
          }

          set({ pushesThisWeek, lastPushDate, contributionMap });

          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
              const s = get();
              const payload = {
                username: s.username,
                user: s.user,
                repos: s.repos,
                pushesThisWeek,
                lastPushDate,
                contributionMap,
              };
              await supabase.storage.from("avatars").upload(`${authUser.id}/github-sync.json`, JSON.stringify(payload), {
                contentType: "application/json",
                upsert: true,
              });
            }
          } catch {
            // Ignore storage errors
          }
          return true;
        } catch {
          return false;
        }
      },

      refreshContributions: async () => {
        const { username, repos, accessToken } = get();
        if (!username) return { ok: false, count: 0 };
        set({ isLoading: true });
        try {
          if (repos.length === 0 && accessToken) {
            const reposRes = await fetch(`${GITHUB_API}/user/repos?sort=updated&per_page=100`, {
              headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
            });
            if (reposRes.ok) {
              const reposData = await reposRes.json();
              set({ repos: reposData });
            }
          }
          if (get().repos.length > 0) {
            await get().refreshFromCommits();
          }
          if (get().pushesThisWeek === 0) {
            await get().refreshEvents();
          }
          if (get().pushesThisWeek === 0 && get().repos.length === 0 && !accessToken) {
            await get().fetchUserAndRepos(username);
          }
          return { ok: true, count: get().pushesThisWeek };
        } catch {
          return { ok: false, count: 0 };
        } finally {
          set({ isLoading: false });
        }
      },

      syncFromSupabase: async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) return;
          const { data: blob, error } = await supabase.storage
            .from("avatars")
            .download(`${authUser.id}/github-sync.json`);
          if (!error && blob) {
            const text = await blob.text();
            const parsed = JSON.parse(text) as {
              username: string;
              user: GitHubUser;
              repos: GitHubRepo[];
              pushesThisWeek: number;
              lastPushDate: string | null;
              contributionMap: ContributionMap;
            };
            set({
              username: parsed.username,
              user: parsed.user ?? null,
              repos: parsed.repos ?? [],
              pushesThisWeek: parsed.pushesThisWeek ?? 0,
              lastPushDate: parsed.lastPushDate,
              contributionMap: parsed.contributionMap ?? {},
            });
          }
        } catch {
          // Ignore - use localStorage fallback
        }
      },

      createRepo: async (name: string, description?: string, isPrivate?: boolean) => {
        const { accessToken } = get();
        if (!accessToken) return null;
        try {
          const res = await fetch(`${GITHUB_API}/user/repos`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/vnd.github+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, description: description || "", private: isPrivate ?? false }),
          });
          if (!res.ok) throw new Error("Failed to create repo");
          const repo = await res.json();
          set((s) => ({ repos: [repo, ...s.repos] }));
          return repo;
        } catch {
          return null;
        }
      },

      deleteRepo: async (fullName: string) => {
        const { accessToken } = get();
        if (!accessToken) return false;
        try {
          const res = await fetch(`${GITHUB_API}/repos/${fullName}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) throw new Error("Failed to delete");
          set((s) => ({ repos: s.repos.filter((r) => r.full_name !== fullName) }));
          return true;
        } catch {
          return false;
        }
      },

      disconnect: async () => {
        set({
          username: null,
          user: null,
          repos: [],
          pushesThisWeek: 0,
          lastPushDate: null,
          contributionMap: {},
          error: null,
        });
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            await supabase.storage.from("avatars").remove([`${authUser.id}/github-sync.json`]);
          }
        } catch {
          // Ignore
        }
      },
    }),
    { name: "focusflow-github" }
  )
);
