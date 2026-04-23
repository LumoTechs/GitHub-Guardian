import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  findIssuesByUser,
  findIssuesByRepo,
  findIssueById,
  updateIssue,
  getIssuesStats,
} from "./queries/githubIssues";

export const issuesRouter = createRouter({
  list: authedQuery.query(({ ctx }) => findIssuesByUser(ctx.user.id, 100)),

  listByRepo: authedQuery
    .input(z.object({ repoId: z.number() }))
    .query(({ ctx, input }) => findIssuesByRepo(input.repoId, ctx.user.id)),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => findIssueById(input.id, ctx.user.id)),

  updateStatus: authedQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "reviewing", "resolved", "ignored"]),
      })
    )
    .mutation(({ ctx, input }) =>
      updateIssue(input.id, ctx.user.id, { status: input.status })
    ),

  stats: authedQuery.query(({ ctx }) => getIssuesStats(ctx.user.id)),
});
