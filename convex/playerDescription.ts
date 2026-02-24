import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { insertInput } from './aiTown/insertInput';
import { playerId } from './aiTown/ids';

export const update = mutation({
  args: {
    worldId: v.id('worlds'),
    playerId,
    identity: v.string(),
    plan: v.string(),
  },
  handler: async (ctx, args) => {
    // Pass identity and plan through the game input so that
    // game memory (game.playerDescriptions) is updated directly.
    // The game engine's saveDiff will then persist changes to the database.
    await insertInput(ctx, args.worldId, 'updatePlayerDescription', {
      playerId: args.playerId,
      identity: args.identity,
      plan: args.plan,
    });

    return { success: true };
  },
});
