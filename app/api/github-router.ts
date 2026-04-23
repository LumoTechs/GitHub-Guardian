import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { env } from "./lib/env";
import {
  findReposByUser,
  findRepoById,
  findRepoByFullName,
  createRepo,
  updateRepo,
  deleteRepo,
} from "./queries/githubRepos";
import {
  findIssueByGithubId,
  createIssue,
  updateIssue,
} from "./queries/githubIssues";
import {
  findPRByGithubId,
  createPR,
  updatePR,
} from "./queries/githubPullRequests";
import { createAlert } from "./queries/alerts";
import { createLog } from "./queries/monitoringLogs";

// ─── GitHub API helpers ─────────────────────────────────────────────────────

const GITHUB_API_BASE = "https://api.github.com";

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-guardian",
  };
  if (env.githubToken) {
    headers.Authorization = `Bearer ${env.githubToken}`;
  }
  return headers;
}

function handleGitHubError(status: number, endpoint: string): never {
  if (status === 404) {
    throw new Error("Repositorio no encontrado o sin acceso con el token configurado");
  }
  if (status === 401 || status === 403) {
    throw new Error("Token de GitHub inválido o sin permisos");
  }
  if (status === 429) {
    throw new Error("Rate limit excedido, reintenta en unos minutos");
  }
  throw new Error(`Error de la API de GitHub (${status}) en ${endpoint}`);
}

async function githubFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: getGitHubHeaders() });
  if (!res.ok) {
    handleGitHubError(res.status, url);
  }
  return res.json() as Promise<T>;
}

// GitHub API raw response types
interface GitHubIssueRaw {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: Array<{ name: string }>;
  user: { login: string } | null;
  html_url: string;
  comments: number;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
}

interface GitHubPullRaw {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: { login: string } | null;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  created_at: string;
  merged_at: string | null;
}

interface GitHubRepoInfo {
  description: string | null;
  language: string | null;
  stargazers_count: number;
  open_issues_count: number;
}

interface MappedIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: string[];
  author: string;
  html_url: string;
  comments: number;
  created_at: string;
  updated_at: string;
}

interface MappedPR {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  author: string;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  created_at: string;
  merged_at: string | null;
}

async function fetchGitHubData(owner: string, name: string): Promise<{
  issues: MappedIssue[];
  pullRequests: MappedPR[];
}> {
  if (!env.githubToken) {
    throw new Error("GITHUB_TOKEN no configurado. Añade el token en las variables de entorno para sincronizar repositorios.");
  }

  const issuesRaw = await githubFetch<GitHubIssueRaw[]>(
    `${GITHUB_API_BASE}/repos/${owner}/${name}/issues?state=open&per_page=100`
  );

  const prsRaw = await githubFetch<GitHubPullRaw[]>(
    `${GITHUB_API_BASE}/repos/${owner}/${name}/pulls?state=all&per_page=50`
  );

  const realIssues = issuesRaw.filter((item) => !item.pull_request);

  const issues: MappedIssue[] = realIssues.map((item) => ({
    id: item.id,
    number: item.number,
    title: item.title,
    body: item.body,
    state: item.state as "open" | "closed",
    labels: item.labels.map((l) => l.name),
    author: item.user?.login ?? "unknown",
    html_url: item.html_url,
    comments: item.comments,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));

  const pullRequests: MappedPR[] = prsRaw.map((item) => ({
    id: item.id,
    number: item.number,
    title: item.title,
    body: item.body,
    state: item.state as "open" | "closed",
    author: item.user?.login ?? "unknown",
    html_url: item.html_url,
    additions: item.additions,
    deletions: item.deletions,
    changed_files: item.changed_files,
    created_at: item.created_at,
    merged_at: item.merged_at,
  }));

  return { issues, pullRequests };
}

async function fetchGitHubRepoInfo(owner: string, name: string): Promise<GitHubRepoInfo | null> {
  if (!env.githubToken) return null;
  try {
    return await githubFetch<GitHubRepoInfo>(
      `${GITHUB_API_BASE}/repos/${owner}/${name}`
    );
  } catch {
    return null;
  }
}

// ─── Severity & bug detection (unchanged) ────────────────────────────────────

function detectSeverity(title: string, body: string, labels: string[]): "low" | "medium" | "high" | "critical" {
  const text = (title + " " + body).toLowerCase();
  if (labels.some((l) => l.includes("critical") || l.includes("security"))) return "critical";
  if (text.includes("crash") || text.includes("security") || text.includes("vulnerability")) return "critical";
  if (text.includes("memory leak") || text.includes("timeout") || text.includes("deadlock")) return "high";
  if (labels.some((l) => l.includes("bug") && l.includes("high"))) return "high";
  if (text.includes("bug") || text.includes("fix") || text.includes("error")) return "medium";
  return "low";
}

function isBug(title: string, labels: string[]): boolean {
  const text = title.toLowerCase();
  return labels.some((l) => l.includes("bug")) || text.includes("fix") || text.includes("bug") || text.includes("error") || text.includes("crash") || text.includes("leak");
}

function hasBugFix(title: string): boolean {
  const text = title.toLowerCase();
  return text.includes("fix") || text.includes("bugfix") || text.includes("resolve") || text.includes("patch");
}

// ─── Router ────────────────────────────────────────────────────────────────

export const githubRouter = createRouter({
  listRepos: authedQuery.query(({ ctx }) => findReposByUser(ctx.user.id)),

  getRepo: authedQuery
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => findRepoById(input.id, ctx.user.id)),

  addRepo: authedQuery
    .input(
      z.object({
        owner: z.string().min(1),
        name: z.string().min(1),
        url: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fullName = `${input.owner}/${input.name}`;
      const existing = await findRepoByFullName(fullName, ctx.user.id);
      if (existing) {
        throw new Error("Repository already exists");
      }

      const repoInfo = await fetchGitHubRepoInfo(input.owner, input.name);

      return createRepo({
        userId: ctx.user.id,
        owner: input.owner,
        name: input.name,
        fullName,
        url: input.url || `https://github.com/${fullName}`,
        description: repoInfo?.description ?? input.description ?? null,
        language: repoInfo?.language ?? null,
        stars: repoInfo?.stargazers_count ?? null,
        openIssuesCount: repoInfo?.open_issues_count ?? null,
      });
    }),

  updateRepo: authedQuery
    .input(
      z.object({
        id: z.number(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      updateRepo(input.id, ctx.user.id, { isActive: input.isActive })
    ),

  deleteRepo: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteRepo(input.id, ctx.user.id)),

  syncRepo: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const repo = await findRepoById(input.id, ctx.user.id);
      if (!repo) {
        throw new Error("Repository not found");
      }

      await createLog({
        userId: ctx.user.id,
        repoId: repo.id,
        action: "sync_start",
        status: "success",
        message: `Starting sync for ${repo.fullName}`,
      });

      try {
        const { issues, pullRequests } = await fetchGitHubData(repo.owner, repo.name);

        // Sync issues
        for (const issue of issues) {
          const existing = await findIssueByGithubId(issue.id, repo.id);
          const severity = detectSeverity(issue.title, issue.body || "", issue.labels);
          const bugFlag = isBug(issue.title, issue.labels);

          if (existing) {
            await updateIssue(existing.id, ctx.user.id, {
              state: issue.state,
              labels: issue.labels,
              commentsCount: issue.comments,
              githubUpdatedAt: new Date(issue.updated_at),
              githubClosedAt: issue.state === "closed" ? new Date() : undefined,
            });
          } else {
            const newIssue = await createIssue({
              repoId: repo.id,
              userId: ctx.user.id,
              githubIssueId: issue.id,
              number: issue.number,
              title: issue.title,
              body: issue.body,
              state: issue.state,
              labels: issue.labels,
              author: issue.author,
              url: issue.html_url,
              commentsCount: issue.comments,
              isBug: bugFlag,
              severity,
              aiSummary: `Detected ${bugFlag ? "bug" : "issue"}: ${issue.title}. Severity: ${severity}.`,
              githubCreatedAt: new Date(issue.created_at),
              githubUpdatedAt: new Date(issue.updated_at),
            });

            if (bugFlag || severity === "critical" || severity === "high") {
              await createAlert({
                userId: ctx.user.id,
                repoId: repo.id,
                type: severity === "critical" ? "critical_issue" : "new_bug",
                title: `New ${severity} issue: ${issue.title}`,
                message: newIssue?.aiSummary || issue.body || "",
                severity,
                relatedIssueId: newIssue?.id,
              });
            }
          }
        }

        // Sync PRs
        for (const pr of pullRequests) {
          const existing = await findPRByGithubId(pr.id, repo.id);
          const bugFix = hasBugFix(pr.title);

          if (existing) {
            await updatePR(existing.id, ctx.user.id, {
              state: pr.state,
              additions: pr.additions,
              deletions: pr.deletions,
              filesChanged: pr.changed_files,
              hasBugFix: bugFix,
            });
          } else {
            const newPR = await createPR({
              repoId: repo.id,
              userId: ctx.user.id,
              githubPrId: pr.id,
              number: pr.number,
              title: pr.title,
              body: pr.body,
              state: pr.state,
              author: pr.author,
              url: pr.html_url,
              additions: pr.additions,
              deletions: pr.deletions,
              filesChanged: pr.changed_files,
              hasBugFix: bugFix,
              aiSummary: bugFix ? `Bug fix PR: ${pr.title}` : `PR: ${pr.title}`,
              githubCreatedAt: new Date(pr.created_at),
            });

            if (bugFix) {
              await createAlert({
                userId: ctx.user.id,
                repoId: repo.id,
                type: "pr_bug_fix",
                title: `Bug fix PR: ${pr.title}`,
                message: newPR?.aiSummary || pr.body || "",
                severity: "medium",
                relatedPrId: newPR?.id,
              });
            }
          }
        }

        // ─── FIX: Update repo metadata too ─────────────────────────────
        const repoInfo = await fetchGitHubRepoInfo(repo.owner, repo.name);

        await updateRepo(repo.id, ctx.user.id, {
          lastSyncedAt: new Date(),
          openIssuesCount: issues.filter((i) => i.state === "open").length,
          description: repoInfo?.description ?? undefined,
          language: repoInfo?.language ?? undefined,
          stars: repoInfo?.stargazers_count ?? undefined,
        });
        // ──────────────────────────────────────────────────────────────

        await createLog({
          userId: ctx.user.id,
          repoId: repo.id,
          action: "sync_complete",
          status: "success",
          message: `Synced ${issues.length} issues and ${pullRequests.length} PRs`,
          details: { issuesCount: issues.length, prsCount: pullRequests.length },
        });

        return { success: true, issuesCount: issues.length, prsCount: pullRequests.length };
      } catch (error) {
        await createLog({
          userId: ctx.user.id,
          repoId: repo.id,
          action: "sync_error",
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    }),

  autoSyncAll: authedQuery.mutation(async ({ ctx }) => {
    const repos = await findReposByUser(ctx.user.id);
    const activeRepos = repos.filter((r) => r.isActive);
    const results = [];

    for (const repo of activeRepos) {
      try {
        const { issues, pullRequests } = await fetchGitHubData(repo.owner, repo.name);
        
        for (const issue of issues) {
          const existing = await findIssueByGithubId(issue.id, repo.id);
          if (!existing) {
            const severity = detectSeverity(issue.title, issue.body || "", issue.labels);
            const bugFlag = isBug(issue.title, issue.labels);
            const newIssue = await createIssue({
              repoId: repo.id,
              userId: ctx.user.id,
              githubIssueId: issue.id,
              number: issue.number,
              title: issue.title,
              body: issue.body,
              state: issue.state,
              labels: issue.labels,
              author: issue.author,
              url: issue.html_url,
              commentsCount: issue.comments,
              isBug: bugFlag,
              severity,
              aiSummary: `Detected ${bugFlag ? "bug" : "issue"}: ${issue.title}`,
              githubCreatedAt: new Date(issue.created_at),
              githubUpdatedAt: new Date(issue.updated_at),
            });

            if (bugFlag || severity === "critical" || severity === "high") {
              await createAlert({
                userId: ctx.user.id,
                repoId: repo.id,
                type: severity === "critical" ? "critical_issue" : "new_bug",
                title: `New ${severity} issue: ${issue.title}`,
                message: newIssue?.aiSummary || "",
                severity,
                relatedIssueId: newIssue?.id,
              });
            }
          }
        }

        for (const pr of pullRequests) {
          const existing = await findPRByGithubId(pr.id, repo.id);
          if (!existing) {
            const bugFix = hasBugFix(pr.title);
            const newPR = await createPR({
              repoId: repo.id,
              userId: ctx.user.id,
              githubPrId: pr.id,
              number: pr.number,
              title: pr.title,
              body: pr.body,
              state: pr.state,
              author: pr.author,
              url: pr.html_url,
              additions: pr.additions,
              deletions: pr.deletions,
              filesChanged: pr.changed_files,
              hasBugFix: bugFix,
              githubCreatedAt: new Date(pr.created_at),
            });

            if (bugFix) {
              await createAlert({
                userId: ctx.user.id,
                repoId: repo.id,
                type: "pr_bug_fix",
                title: `Bug fix PR: ${pr.title}`,
                message: newPR?.aiSummary || "",
                severity: "medium",
                relatedPrId: newPR?.id,
              });
            }
          }
        }

        // ─── FIX: Update repo metadata in autoSync too ───────────────
        const repoInfo = await fetchGitHubRepoInfo(repo.owner, repo.name);

        await updateRepo(repo.id, ctx.user.id, {
          lastSyncedAt: new Date(),
          description: repoInfo?.description ?? undefined,
          language: repoInfo?.language ?? undefined,
          stars: repoInfo?.stargazers_count ?? undefined,
        });
        // ──────────────────────────────────────────────────────────────

        results.push({ repo: repo.fullName, success: true, issues: issues.length, prs: pullRequests.length });
      } catch (error) {
        results.push({
          repo: repo.fullName,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { results, totalRepos: activeRepos.length };
  }),

  // ─── New: GitHub token status & test ──────────────────────────────────────

  getGitHubTokenStatus: authedQuery.query(() => {
    return {
      configured: !!env.githubToken,
    };
  }),

  testGitHubConnection: authedQuery.mutation(async () => {
    if (!env.githubToken) {
      throw new Error("GITHUB_TOKEN no configurado");
    }
    const res = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: getGitHubHeaders(),
    });
    if (!res.ok) {
      handleGitHubError(res.status, "/user");
    }
    const data = await res.json() as { login: string; name?: string };
    return {
      username: data.login,
      displayName: data.name || data.login,
    };
  }),
});
