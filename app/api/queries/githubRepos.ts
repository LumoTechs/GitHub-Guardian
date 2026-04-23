import { getDb } from "./connection";
import { githubRepos } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function findReposByUser(userId: number) {
  return getDb().query.githubRepos.findMany({
    where: eq(githubRepos.userId, userId),
    orderBy: desc(githubRepos.updatedAt),
  });
}

export async function findRepoById(id: number, userId: number) {
  return getDb().query.githubRepos.findFirst({
    where: and(eq(githubRepos.id, id), eq(githubRepos.userId, userId)),
  });
}

export async function findRepoByFullName(fullName: string, userId: number) {
  return getDb().query.githubRepos.findFirst({
    where: and(eq(githubRepos.fullName, fullName), eq(githubRepos.userId, userId)),
  });
}

export async function createRepo(data: {
  userId: number;
  owner: string;
  name: string;
  fullName: string;
  url?: string;
  description?: string;
  stars?: number;
  openIssuesCount?: number;
  language?: string;
}) {
  const [result] = await getDb()
    .insert(githubRepos)
    .values(data)
    .$returningId();
  return getDb().query.githubRepos.findFirst({
    where: eq(githubRepos.id, result.id),
  });
}

export async function updateRepo(
  id: number,
  userId: number,
  data: Partial<{
    isActive: boolean;
    lastSyncedAt: Date;
    stars: number;
    openIssuesCount: number;
    description: string;
    language: string;
  }>
) {
  await getDb()
    .update(githubRepos)
    .set(data)
    .where(and(eq(githubRepos.id, id), eq(githubRepos.userId, userId)));
  return findRepoById(id, userId);
}

export async function deleteRepo(id: number, userId: number) {
  await getDb()
    .delete(githubRepos)
    .where(and(eq(githubRepos.id, id), eq(githubRepos.userId, userId)));
}
