import { getDb } from "./connection";
import { githubPullRequests } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function findPRsByUser(userId: number, limit?: number) {
  return getDb().query.githubPullRequests.findMany({
    where: eq(githubPullRequests.userId, userId),
    orderBy: desc(githubPullRequests.createdAt),
    limit,
  });
}

export async function findPRsByRepo(repoId: number, userId: number) {
  return getDb().query.githubPullRequests.findMany({
    where: and(eq(githubPullRequests.repoId, repoId), eq(githubPullRequests.userId, userId)),
    orderBy: desc(githubPullRequests.createdAt),
  });
}

export async function findPRById(id: number, userId: number) {
  return getDb().query.githubPullRequests.findFirst({
    where: and(eq(githubPullRequests.id, id), eq(githubPullRequests.userId, userId)),
  });
}

export async function findPRByGithubId(githubPrId: number, repoId: number) {
  return getDb().query.githubPullRequests.findFirst({
    where: and(
      eq(githubPullRequests.githubPrId, githubPrId),
      eq(githubPullRequests.repoId, repoId)
    ),
  });
}

export async function createPR(data: {
  repoId: number;
  userId: number;
  githubPrId: number;
  number: number;
  title: string;
  body?: string;
  state?: "open" | "closed" | "merged";
  author?: string;
  url?: string;
  additions?: number;
  deletions?: number;
  filesChanged?: number;
  hasBugFix?: boolean;
  aiSummary?: string;
  githubCreatedAt?: Date;
  githubMergedAt?: Date;
}) {
  const [result] = await getDb()
    .insert(githubPullRequests)
    .values(data)
    .$returningId();
  return getDb().query.githubPullRequests.findFirst({
    where: eq(githubPullRequests.id, result.id),
  });
}

export async function updatePR(
  id: number,
  userId: number,
  data: Partial<{
    state: "open" | "closed" | "merged";
    additions: number;
    deletions: number;
    filesChanged: number;
    hasBugFix: boolean;
    aiSummary: string;
  }>
) {
  await getDb()
    .update(githubPullRequests)
    .set(data)
    .where(and(eq(githubPullRequests.id, id), eq(githubPullRequests.userId, userId)));
  return findPRById(id, userId);
}

export async function getPRsStats(userId: number) {
  const db = getDb();
  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(githubPullRequests)
    .where(eq(githubPullRequests.userId, userId));
  
  const open = await db
    .select({ count: sql<number>`count(*)` })
    .from(githubPullRequests)
    .where(and(eq(githubPullRequests.userId, userId), eq(githubPullRequests.state, "open")));
  
  const bugFixes = await db
    .select({ count: sql<number>`count(*)` })
    .from(githubPullRequests)
    .where(and(eq(githubPullRequests.userId, userId), eq(githubPullRequests.hasBugFix, true)));

  return {
    total: total[0]?.count ?? 0,
    open: open[0]?.count ?? 0,
    bugFixes: bugFixes[0]?.count ?? 0,
  };
}
