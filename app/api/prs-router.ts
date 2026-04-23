import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  findPRsByUser,
  findPRsByRepo,
  findPRById,
  getPRsStats,
} from "./queries/githubPullRequests";

export const prsRouter = createRouter({
  list: authedQuery.query(({ ctx }) => findPRsByUser(ctx.user.id, 100)),

  listByRepo: authedQuery
    .input(z.object({ repoId: z.number() }))
    .query(({ ctx, input }) => findPRsByRepo(input.repoId, ctx.user.id)),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => findPRById(input.id, ctx.user.id)),

  stats: authedQuery.query(({ ctx }) => getPRsStats(ctx.user.id)),
});
