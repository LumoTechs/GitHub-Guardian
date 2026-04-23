import { getDb } from "./connection";
import { githubIssues } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function findIssuesByUser(userId: number, limit?: number) {
  return getDb().query.githubIssues.findMany({
    where: eq(githubIssues.userId, userId),
    orderBy: desc(githubIssues.createdAt),
    limit,
  });
}

export async function findIssuesByRepo(repoId: number, userId: number) {
  return getDb().query.githubIssues.findMany({
    where: and(eq(githubIssues.repoId, repoId), eq(githubIssues.userId, userId)),
    orderBy: desc(githubIssues.createdAt),
  });
}

export async function findIssueById(id: number, userId: number) {
  return getDb().query.githubIssues.findFirst({
    where: and(eq(githubIssues.id, id), eq(githubIssues.userId, userId)),
  });
}

export async function findIssueByGithubId(githubIssueId: number, repoId: number) {
  return getDb().query.githubIssues.findFirst({
    where: and(
      eq(githubIssues.githubIssueId, githubIssueId),
      eq(githubIssues.repoId, repoId)
    ),
  });
}

export async function createIssue(data: {
  repoId: number;
  userId: number;
  githubIssueId: number;
  number: number;
  title: string;
  body?: string;
  state?: "open" | "closed";
  labels?: string[];
  author?: string;
  url?: string;
  commentsCount?: number;
  isBug?: boolean;
  severity?: "low" | "medium" | "high" | "critical";
  aiSummary?: string;
  status?: "new" | "reviewing" | "resolved" | "ignored";
  githubCreatedAt?: Date;
  githubUpdatedAt?: Date;
  githubClosedAt?: Date;
}) {
  const [result] = await getDb()
    .insert(githubIssues)
    .values(data)
    .$returningId();
  return getDb().query.githubIssues.findFirst({
    where: eq(githubIssues.id, result.id),
  });
}

export async function updateIssue(
  id: number,
  userId: number,
  data: Partial<{
    state: "open" | "closed";
    status: "new" | "reviewing" | "resolved" | "ignored";
    labels: string[];
    commentsCount: number;
    aiSummary: string;
    githubUpdatedAt: Date;
    githubClosedAt: Date;
  }>
) {
  await getDb()
    .update(githubIssues)
    .set(data)
    .where(and(eq(githubIssues.id, id), eq(githubIssues.userId, userId)));
  return findIssueById(id, userId);
}

export async function getIssuesStats(userId: number) {
  const db = getDb();
  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(githubIssues)
    .where(eq(githubIssues.userId, userId));
  
  const open = await db
    .select({ count: sql<number>`count(*)` })
    .from(githubIssues)
    .where(and(eq(githubIssues.userId, userId), eq(githubIssues.state, "open")));
  
  const bugs = await db
    .select({ count: sql<number>`count(*)` })
    .from(githubIssues)
    .where(and(eq(githubIssues.userId, userId), eq(githubIssues.isBug, true)));
  
  const critical = await db
    .select({ count: sql<number>`count(*)` })
    .from(githubIssues)
    .where(and(eq(githubIssues.userId, userId), eq(githubIssues.severity, "critical")));

  return {
    total: total[0]?.count ?? 0,
    open: open[0]?.count ?? 0,
    bugs: bugs[0]?.count ?? 0,
    critical: critical[0]?.count ?? 0,
  };
}
