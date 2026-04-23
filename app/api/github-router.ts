import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
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

// Simulated GitHub API fetch - in production, replace with actual GitHub API calls
async function simulateGitHubFetch(owner: string, name: string) {
  // Mock data simulating GitHub API response
  const mockIssues = [
    {
      id: Math.floor(Math.random() * 1000000),
      number: Math.floor(Math.random() * 200) + 1,
      title: "Memory leak in user authentication flow",
      body: "Detected memory leak when processing concurrent auth requests...",
      state: "open" as const,
      labels: ["bug", "high-priority", "security"],
      author: "dev-team",
      html_url: `https://github.com/${owner}/${name}/issues/1`,
      comments: 3,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: Math.floor(Math.random() * 1000000),
      number: Math.floor(Math.random() * 200) + 1,
      title: "CSS rendering issue on mobile Safari",
      body: "Flexbox layout breaks on iPhone 14 Pro Max...",
      state: "open" as const,
      labels: ["bug", "ui", "mobile"],
      author: "frontend-dev",
      html_url: `https://github.com/${owner}/${name}/issues/2`,
      comments: 1,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: Math.floor(Math.random() * 1000000),
      number: Math.floor(Math.random() * 200) + 1,
      title: "Database connection timeout under load",
      body: "Connection pool exhausted during peak hours...",
      state: "open" as const,
      labels: ["bug", "performance", "critical"],
      author: "backend-dev",
      html_url: `https://github.com/${owner}/${name}/issues/3`,
      comments: 7,
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: Math.floor(Math.random() * 1000000),
      number: Math.floor(Math.random() * 200) + 1,
      title: "TypeScript type inference broken after update",
      body: "Generic types not resolving correctly in v5.0...",
      state: "open" as const,
      labels: ["bug", "typescript"],
      author: "type-master",
      html_url: `https://github.com/${owner}/${name}/issues/4`,
      comments: 2,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockPRs = [
    {
      id: Math.floor(Math.random() * 1000000),
      number: Math.floor(Math.random() * 100) + 1,
      title: "Fix: Resolve memory leak in auth middleware",
      body: "Implemented proper cleanup for session objects...",
      state: "open" as const,
      author: "backend-dev",
      html_url: `https://github.com/${owner}/${name}/pull/1`,
      additions: 45,
      deletions: 12,
      changed_files: 3,
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      merged_at: null,
    },
    {
      id: Math.floor(Math.random() * 1000000),
      number: Math.floor(Math.random() * 100) + 1,
      title: "Refactor: Optimize database queries",
      body: "Added indexes and reduced N+1 queries...",
      state: "open" as const,
      author: "db-expert",
      html_url: `https://github.com/${owner}/${name}/pull/2`,
      additions: 120,
      deletions: 45,
      changed_files: 8,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      merged_at: null,
    },
  ];

  return { issues: mockIssues, pullRequests: mockPRs };
}

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
      return createRepo({
        userId: ctx.user.id,
        owner: input.owner,
        name: input.name,
        fullName,
        url: input.url || `https://github.com/${fullName}`,
        description: input.description,
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
        const { issues, pullRequests } = await simulateGitHubFetch(repo.owner, repo.name);

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
              githubClosedAt: (issue.state as string) === "closed" ? new Date() : undefined,
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

        await updateRepo(repo.id, ctx.user.id, {
          lastSyncedAt: new Date(),
          openIssuesCount: issues.filter((i) => i.state === "open").length,
        });

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
        const { issues, pullRequests } = await simulateGitHubFetch(repo.owner, repo.name);
        
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

        await updateRepo(repo.id, ctx.user.id, {
          lastSyncedAt: new Date(),
        });

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
});
