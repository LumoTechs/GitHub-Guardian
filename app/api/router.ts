import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { githubRouter } from "./github-router";
import { issuesRouter } from "./issues-router";
import { prsRouter } from "./prs-router";
import { alertsRouter } from "./alerts-router";
import { dashboardRouter } from "./dashboard-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  github: githubRouter,
  issues: issuesRouter,
  pullRequests: prsRouter,
  alerts: alertsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
