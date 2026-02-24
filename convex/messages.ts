import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { insertInput } from './aiTown/insertInput';
import { conversationId, playerId } from './aiTown/ids';

export const listMessages = query({
  args: {
    worldId: v.id('worlds'),
    conversationId,
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('conversationId', (q) => q.eq('worldId', args.worldId).eq('conversationId', args.conversationId))
      .collect();
    const out = [];
    for (const message of messages) {
      const playerDescription = await ctx.db
        .query('playerDescriptions')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', message.author))
        .first();
      if (!playerDescription) {
        throw new Error(`Invalid author ID: ${message.author}`);
      }
      out.push({ ...message, authorName: playerDescription.name });
    }
    return out;
  },
});

export const getLatestMessageForPlayer = query({
  args: {
    worldId: v.id('worlds'),
    playerId,
  },
  handler: async (ctx, args) => {
    // Get all messages from this player, ordered by creation time descending
    const messages = await ctx.db
      .query('messages')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .filter((q) => q.eq(q.field('author'), args.playerId))
      .order('desc')
      .take(1);
    
    if (messages.length === 0) {
      return null;
    }
    
    return messages[0];
  },
});

// Used for batch querying messages for speech bubbles
export const getRecentMessages = query({
  args: {
    worldId: v.id('worlds'),
    lookbackMs: v.optional(v.number()), // Default 15s
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) return [];
    
    // Look back 15 seconds by default
    const lookback = args.lookbackMs ?? 15000;
    const cutoff = world.time - lookback;
    
    // We can't query by gameTime efficiently without an index, so we use _creationTime
    // which is a reasonable approximation for recent messages.
    // Or we rely on the fact that worldId index exists and we just filter in memory 
    // since recent messages volume should be low.
    
    // Better strategy: query messages by worldId (we added this index), sorted by creation time desc, take 50
    const messages = await ctx.db
      .query('messages')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .order('desc')
      .take(50);
      
    // Filter client-side for recency based on gameTime if available, or just return them
    // The frontend will handle the "10s display duration" logic.
    // We just return enough messages. 50 is plenty for screen display.
    return messages;
  },
});

export const writeMessage = mutation({
  args: {
    worldId: v.id('worlds'),
    conversationId,
    messageUuid: v.string(),
    playerId,
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      author: args.playerId,
      messageUuid: args.messageUuid,
      text: args.text,
      worldId: args.worldId,
      gameTime: world?.time ?? 0,
    });
    await insertInput(ctx, args.worldId, 'finishSendingMessage', {
      conversationId: args.conversationId,
      playerId: args.playerId,
      timestamp: Date.now(),
    });
  },
});


