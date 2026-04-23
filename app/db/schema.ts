import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  mysqlEnum,
  bigint,
  int,
  boolean,
  index,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export const githubRepos = mysqlTable(
  "githubRepos",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    owner: varchar("owner", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    fullName: varchar("fullName", { length: 512 }).notNull(),
    url: text("url"),
    description: text("description"),
    stars: int("stars").default(0),
    openIssuesCount: int("openIssuesCount").default(0),
    language: varchar("language", { length: 100 }),
    isActive: boolean("isActive").default(true).notNull(),
    lastSyncedAt: timestamp("lastSyncedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    fullNameIdx: index("full_name_idx").on(table.fullName),
  })
);

export const githubIssues = mysqlTable(
  "githubIssues",
  {
    id: serial("id").primaryKey(),
    repoId: bigint("repoId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    githubIssueId: bigint("githubIssueId", { mode: "number" }).notNull(),
    number: int("number").notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    body: text("body"),
    state: mysqlEnum("state", ["open", "closed"]).default("open").notNull(),
    labels: json("labels").$type<string[]>(),
    author: varchar("author", { length: 255 }),
    url: text("url"),
    commentsCount: int("commentsCount").default(0),
    isBug: boolean("isBug").default(false),
    severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("low"),
    aiSummary: text("aiSummary"),
    status: mysqlEnum("status", ["new", "reviewing", "resolved", "ignored"]).default("new").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    githubCreatedAt: timestamp("githubCreatedAt"),
    githubUpdatedAt: timestamp("githubUpdatedAt"),
    githubClosedAt: timestamp("githubClosedAt"),
  },
  (table) => ({
    repoIdIdx: index("issue_repo_id_idx").on(table.repoId),
    userIdIdx: index("issue_user_id_idx").on(table.userId),
    stateIdx: index("issue_state_idx").on(table.state),
    statusIdx: index("issue_status_idx").on(table.status),
    githubIdIdx: index("github_issue_id_idx").on(table.githubIssueId),
  })
);

export const githubPullRequests = mysqlTable(
  "githubPullRequests",
  {
    id: serial("id").primaryKey(),
    repoId: bigint("repoId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    githubPrId: bigint("githubPrId", { mode: "number" }).notNull(),
    number: int("number").notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    body: text("body"),
    state: mysqlEnum("state", ["open", "closed", "merged"]).default("open").notNull(),
    author: varchar("author", { length: 255 }),
    url: text("url"),
    additions: int("additions").default(0),
    deletions: int("deletions").default(0),
    filesChanged: int("filesChanged").default(0),
    hasBugFix: boolean("hasBugFix").default(false),
    aiSummary: text("aiSummary"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    githubCreatedAt: timestamp("githubCreatedAt"),
    githubMergedAt: timestamp("githubMergedAt"),
  },
  (table) => ({
    repoIdIdx: index("pr_repo_id_idx").on(table.repoId),
    userIdIdx: index("pr_user_id_idx").on(table.userId),
    stateIdx: index("pr_state_idx").on(table.state),
  })
);

export const alerts = mysqlTable(
  "alerts",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    repoId: bigint("repoId", { mode: "number", unsigned: true }).notNull(),
    type: mysqlEnum("type", [
      "new_bug",
      "critical_issue",
      "pr_bug_fix",
      "security_alert",
      "performance_issue",
      "ci_failure",
      "general",
    ]).default("general").notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    message: text("message"),
    severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
    relatedIssueId: bigint("relatedIssueId", { mode: "number", unsigned: true }),
    relatedPrId: bigint("relatedPrId", { mode: "number", unsigned: true }),
    isRead: boolean("isRead").default(false).notNull(),
    isResolved: boolean("isResolved").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("alert_user_id_idx").on(table.userId),
    repoIdIdx: index("alert_repo_id_idx").on(table.repoId),
    typeIdx: index("alert_type_idx").on(table.type),
    readIdx: index("alert_read_idx").on(table.isRead),
  })
);

export const monitoringLogs = mysqlTable(
  "monitoringLogs",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    repoId: bigint("repoId", { mode: "number", unsigned: true }),
    action: varchar("action", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["success", "error", "warning"]).default("success").notNull(),
    message: text("message"),
    details: json("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("log_user_id_idx").on(table.userId),
    repoIdIdx: index("log_repo_id_idx").on(table.repoId),
    actionIdx: index("log_action_idx").on(table.action),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type GithubRepo = typeof githubRepos.$inferSelect;
export type InsertGithubRepo = typeof githubRepos.$inferInsert;

export type GithubIssue = typeof githubIssues.$inferSelect;
export type InsertGithubIssue = typeof githubIssues.$inferInsert;

export type GithubPullRequest = typeof githubPullRequests.$inferSelect;
export type InsertGithubPullRequest = typeof githubPullRequests.$inferInsert;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

export type MonitoringLog = typeof monitoringLogs.$inferSelect;
export type InsertMonitoringLog = typeof monitoringLogs.$inferInsert;
