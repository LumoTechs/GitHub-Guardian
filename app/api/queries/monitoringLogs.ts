import { getDb } from "./connection";
import { monitoringLogs } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function findLogsByUser(userId: number, limit?: number) {
  return getDb().query.monitoringLogs.findMany({
    where: eq(monitoringLogs.userId, userId),
    orderBy: desc(monitoringLogs.createdAt),
    limit,
  });
}

export async function findLogsByRepo(repoId: number, userId: number, limit?: number) {
  return getDb().query.monitoringLogs.findMany({
    where: and(eq(monitoringLogs.repoId, repoId), eq(monitoringLogs.userId, userId)),
    orderBy: desc(monitoringLogs.createdAt),
    limit,
  });
}

export async function createLog(data: {
  userId: number;
  repoId?: number;
  action: string;
  status: "success" | "error" | "warning";
  message?: string;
  details?: Record<string, unknown>;
}) {
  const [result] = await getDb()
    .insert(monitoringLogs)
    .values(data)
    .$returningId();
  return getDb().query.monitoringLogs.findFirst({
    where: eq(monitoringLogs.id, result.id),
  });
}
