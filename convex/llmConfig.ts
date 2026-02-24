import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const CONFIG_KEY = 'llm_mode';
type LLMMode = 'ollama' | 'api' | 'deepseek-reasoner';

export const getLLMConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query('configurations')
      .withIndex('by_key', (q) => q.eq('key', CONFIG_KEY))
      .unique();

    const mode = (config?.value as LLMMode) || 'ollama';
    return { mode };
  },
});

export const toggleLLM = mutation({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query('configurations')
      .withIndex('by_key', (q) => q.eq('key', CONFIG_KEY))
      .unique();

    const currentMode = (config?.value as LLMMode) || 'ollama';
    let nextMode: LLMMode = 'ollama';

    if (currentMode === 'ollama') nextMode = 'api';
    else if (currentMode === 'api') nextMode = 'deepseek-reasoner';
    else nextMode = 'ollama';

    if (config) {
      await ctx.db.patch(config._id, { value: nextMode });
    } else {
      await ctx.db.insert('configurations', { key: CONFIG_KEY, value: nextMode });
    }

    return nextMode;
  },
});
