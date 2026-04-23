import { relations } from "drizzle-orm";
import { users, githubRepos, githubIssues, githubPullRequests, alerts, monitoringLogs } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  repos: many(githubRepos),
  issues: many(githubIssues),
  pullRequests: many(githubPullRequests),
  alerts: many(alerts),
  logs: many(monitoringLogs),
}));

export const githubReposRelations = relations(githubRepos, ({ one, many }) => ({
  user: one(users, { fields: [githubRepos.userId], references: [users.id] }),
  issues: many(githubIssues),
  pullRequests: many(githubPullRequests),
  alerts: many(alerts),
  logs: many(monitoringLogs),
}));

export const githubIssuesRelations = relations(githubIssues, ({ one }) => ({
  repo: one(githubRepos, { fields: [githubIssues.repoId], references: [githubRepos.id] }),
  user: one(users, { fields: [githubIssues.userId], references: [users.id] }),
}));

export const githubPullRequestsRelations = relations(githubPullRequests, ({ one }) => ({
  repo: one(githubRepos, { fields: [githubPullRequests.repoId], references: [githubRepos.id] }),
  user: one(users, { fields: [githubPullRequests.userId], references: [users.id] }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  repo: one(githubRepos, { fields: [alerts.repoId], references: [githubRepos.id] }),
  user: one(users, { fields: [alerts.userId], references: [users.id] }),
}));

export const monitoringLogsRelations = relations(monitoringLogs, ({ one }) => ({
  repo: one(githubRepos, { fields: [monitoringLogs.repoId], references: [githubRepos.id] }),
  user: one(users, { fields: [monitoringLogs.userId], references: [users.id] }),
}));
