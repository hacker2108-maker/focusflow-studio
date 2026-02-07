import { useParams, useNavigate } from "react-router-dom";
import { useGitHubStore, type GitHubRepo } from "@/store/githubStore";
import { RepoBrowser } from "@/components/github/RepoBrowser";
import { useEffect, useState } from "react";

export default function GitHubRepo() {
  const { owner, name } = useParams<{ owner: string; name: string }>();
  const navigate = useNavigate();
  const { repos } = useGitHubStore();
  const [repo, setRepo] = useState<GitHubRepo | null>(null);

  useEffect(() => {
    if (!owner || !name) return;
    const fullName = `${owner}/${name}`;
    const found = repos.find((r) => r.full_name === fullName);
    if (found) {
      setRepo(found);
    } else {
      setRepo({
        id: 0,
        name,
        full_name: fullName,
        description: null,
        html_url: `https://github.com/${fullName}`,
        stargazers_count: 0,
        forks_count: 0,
        language: null,
        updated_at: "",
        private: false,
      });
    }
  }, [owner, name, repos]);

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      <RepoBrowser
        repo={repo}
        open={!!repo}
        onOpenChange={() => navigate("/github")}
        fullPage
      />
    </div>
  );
}
