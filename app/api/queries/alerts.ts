import { getDb } from "./connection";
import { alerts } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function findAlertsByUser(userId: number, limit?: number) {
  return getDb().query.alerts.findMany({
    where: eq(alerts.userId, userId),
    orderBy: desc(alerts.createdAt),
    limit,
  });
}

export async function findUnreadAlerts(userId: number) {
  return getDb().query.alerts.findMany({
    where: and(eq(alerts.userId, userId), eq(alerts.isRead, false)),
    orderBy: desc(alerts.createdAt),
  });
}

export async function findAlertById(id: number, userId: number) {
  return getDb().query.alerts.findFirst({
    where: and(eq(alerts.id, id), eq(alerts.userId, userId)),
  });
}

export async function createAlert(data: {
  userId: number;
  repoId: number;
  type: "new_bug" | "critical_issue" | "pr_bug_fix" | "security_alert" | "performance_issue" | "ci_failure" | "general";
  title: string;
  message?: string;
  severity?: "low" | "medium" | "high" | "critical";
  relatedIssueId?: number;
  relatedPrId?: number;
}) {
  const [result] = await getDb()
    .insert(alerts)
    .values(data)
    .$returningId();
  return getDb().query.alerts.findFirst({
    where: eq(alerts.id, result.id),
  });
}

export async function markAlertAsRead(id: number, userId: number) {
  await getDb()
    .update(alerts)
    .set({ isRead: true })
    .where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
  return findAlertById(id, userId);
}

export async function markAlertAsResolved(id: number, userId: number) {
  await getDb()
    .update(alerts)
    .set({ isResolved: true, isRead: true })
    .where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
  return findAlertById(id, userId);
}

export async function getAlertStats(userId: number) {
  const db = getDb();
  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(alerts)
    .where(eq(alerts.userId, userId));
  
  const unread = await db
    .select({ count: sql<number>`count(*)` })
    .from(alerts)
    .where(and(eq(alerts.userId, userId), eq(alerts.isRead, false)));

  return {
    total: total[0]?.count ?? 0,
    unread: unread[0]?.count ?? 0,
  };
}
