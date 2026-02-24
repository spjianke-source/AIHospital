import { v } from 'convex/values';
import { query } from './_generated/server';
import { playerId } from './aiTown/ids';

export const latestMemories = query({
  args: {
    playerId: v.string(), // Accepting string to be flexible with ID passing from frontend
  },
  handler: async (ctx, args) => {
    const memoryLimit = 20;
    
    // We cast the string to the specific Id type used in schema if needed, 
    // but the schema uses `playerId` alias which is a string identifier in game logic,
    // though deeper down it might be an ID. 
    // Let's check schema.ts again. memory tables use `playerId`, which is `v.string()` (GameId).
    
    // Actually, looking at aiTown/ids.ts, `playerId` is a branded string.
    // We can just pass it as string for the index query if the index expects the value.
    
    const memories = await ctx.db
      .query('memories')
      .withIndex('playerId', (q) => q.eq('playerId', args.playerId as any)) 
      .order('desc')
      .take(memoryLimit);

    return memories;
  },
});
