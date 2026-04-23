import { createRouter, authedQuery } from "./middleware";
import { findReposByUser } from "./queries/githubRepos";
import { getIssuesStats } from "./queries/githubIssues";
import { getPRsStats } from "./queries/githubPullRequests";
import { getAlertStats } from "./queries/alerts";
import { findLogsByUser } from "./queries/monitoringLogs";

export const dashboardRouter = createRouter({
  stats: authedQuery.query(async ({ ctx }) => {
    const [repos, issues, prs, alerts, logs] = await Promise.all([
      findReposByUser(ctx.user.id),
      getIssuesStats(ctx.user.id),
      getPRsStats(ctx.user.id),
      getAlertStats(ctx.user.id),
      findLogsByUser(ctx.user.id, 10),
    ]);

    const activeRepos = repos.filter((r) => r.isActive);
    const recentlySynced = repos.filter(
      (r) => r.lastSyncedAt && new Date().getTime() - new Date(r.lastSyncedAt).getTime() < 86400000
    );

    return {
      repos: {
        total: repos.length,
        active: activeRepos.length,
        recentlySynced: recentlySynced.length,
      },
      issues,
      pullRequests: prs,
      alerts,
      recentLogs: logs,
    };
  }),
});
