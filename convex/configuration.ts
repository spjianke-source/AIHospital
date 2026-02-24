import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getLLMMode = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query('configurations')
      .withIndex('by_key', (q) => q.eq('key', 'llm_mode'))
      .first();
    
    // Default to 'deepseek-reasoner' if not set
    return config?.value ?? 'ollama';
  },
});

export const setLLMMode = mutation({
  args: {
    mode: v.union(v.literal('ollama'), v.literal('api'), v.literal('deepseek-reasoner')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('configurations')
      .withIndex('by_key', (q) => q.eq('key', 'llm_mode'))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.mode });
    } else {
      await ctx.db.insert('configurations', { key: 'llm_mode', value: args.mode });
    }
  },
});
