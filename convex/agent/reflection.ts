import { v } from 'convex/values';
import { query } from '../_generated/server';
import { playerId } from '../aiTown/ids';



export const latestReflection = query({
  args: {
    worldId: v.id('worlds'),
    playerId: v.optional(playerId),
  },
  handler: async (ctx, args) => {
    if (!args.playerId) {
      return null;
    }

    const reflections = await ctx.db
      .query('memories')
      .withIndex('playerId_type', (q) =>
        q.eq('playerId', args.playerId!).eq('data.type', 'reflection'),
      )
      .order('desc')
      .take(3);

    if (reflections.length === 0) {
      return null;
    }

    // Since we want to show the "session" of reflection, we can group them or just show them.
    // The user asked for the "3 high level insights".
    // We return them as a list.
    return {
      insights: reflections.map((r) => r.description),
      ts: reflections[0]._creationTime,
    };
  },
});


