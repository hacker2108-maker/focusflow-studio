import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  createRepo: (name: string, description?: string, isPrivate?: boolean) => Promise<GitHubRepo | null>;
  deleteRepo: (fullName: string) => Promise<boolean>;
  disconnect: () => void;
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
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : "Something went wrong",
          });
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

      disconnect: () =>
        set({
          username: null,
          user: null,
          repos: [],
          pushesThisWeek: 0,
          lastPushDate: null,
          contributionMap: {},
          error: null,
        }),
    }),
    { name: "focusflow-github" }
  )
);
