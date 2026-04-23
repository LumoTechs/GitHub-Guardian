import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  findAlertsByUser,
  findUnreadAlerts,
  findAlertById,
  markAlertAsRead,
  markAlertAsResolved,
  getAlertStats,
} from "./queries/alerts";

export const alertsRouter = createRouter({
  list: authedQuery.query(({ ctx }) => findAlertsByUser(ctx.user.id, 100)),

  unread: authedQuery.query(({ ctx }) => findUnreadAlerts(ctx.user.id)),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => findAlertById(input.id, ctx.user.id)),

  markAsRead: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => markAlertAsRead(input.id, ctx.user.id)),

  markAsResolved: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => markAlertAsResolved(input.id, ctx.user.id)),

  stats: authedQuery.query(({ ctx }) => getAlertStats(ctx.user.id)),
});
