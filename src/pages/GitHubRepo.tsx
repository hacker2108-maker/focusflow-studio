import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { RepoBrowser } from "@/components/github/RepoBrowser";
import { useGitHubStore, type GitHubRepo } from "@/store/githubStore";

export default function GitHubRepoPage() {
  const { owner, name } = useParams<{ owner: string; name: string }>();
  const navigate = useNavigate();
  const { repos, accessToken } = useGitHubStore();
  const [repo, setRepo] = useState<GitHubRepo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!owner || !name) {
      setLoading(false);
      return;
    }
    const found = repos.find((r) => r.full_name === `${owner}/${name}`);
    if (found) {
      setRepo(found);
      setLoading(false);
      return;
    }
    if (accessToken) {
      fetch(`https://api.github.com/repos/${owner}/${name}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          setRepo(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [owner, name, repos, accessToken]);

  if (!owner || !name) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Repository not found</p>
        <button
          onClick={() => navigate("/github")}
          className="text-primary hover:underline"
        >
          Back to GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background pt-14 md:pt-0">
      <RepoBrowser
        repo={repo}
        open={true}
        onOpenChange={(open) => !open && navigate("/github")}
      />
    </div>
  );
}
