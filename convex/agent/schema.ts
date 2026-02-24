import { v } from 'convex/values';
import { playerId, conversationId } from '../aiTown/ids';
import { defineTable } from 'convex/server';
import { EMBEDDING_DIMENSION } from '../util/llm';

export const memoryFields = {
  playerId,
  description: v.string(),
  embeddingId: v.id('memoryEmbeddings'),
  importance: v.number(),
  lastAccess: v.number(),
  data: v.union(
    // Setting up dynamics between players
    v.object({
      type: v.literal('relationship'),
      // The player this memory is about, from the perspective of the player
      // whose memory this is.
      playerId,
    }),
    v.object({
      type: v.literal('conversation'),
      conversationId,
      // The other player(s) in the conversation.
      playerIds: v.array(playerId),
    }),
    v.object({
      type: v.literal('reflection'),
      relatedMemoryIds: v.array(v.id('memories')),
    }),
  ),
};
export const memoryTables = {
  memories: defineTable(memoryFields)
    .index('embeddingId', ['embeddingId'])
    .index('playerId_type', ['playerId', 'data.type'])
    .index('playerId', ['playerId']),
  memoryEmbeddings: defineTable({
    playerId,
    embedding: v.array(v.float64()),
  }).vectorIndex('embedding', {
    vectorField: 'embedding',
    filterFields: ['playerId'],
    dimensions: EMBEDDING_DIMENSION,
  }),
};

export const agentTables = {
  ...memoryTables,
  characterActions: defineTable({
    worldId: v.id('worlds'),
    playerId,
    conversationId: conversationId,
    action: v.string(),
    ts: v.number(),
  })
    .index('by_player', ['worldId', 'playerId'])
    .index('by_conversation', ['worldId', 'conversationId']),
  doctorReflections: defineTable({
    worldId: v.id('worlds'),
    doctorId: playerId,
    patientId: playerId,
    conversationId: conversationId,
    reflection: v.string(),
    ts: v.number(),
  })
  .index('by_doctor', ['worldId', 'doctorId'])
  .index('by_conversation', ['worldId', 'conversationId'])
  .index('by_patient', ['worldId', 'patientId'])
  .index('by_world', ['worldId', 'ts']),
  embeddingsCache: defineTable({
    textHash: v.bytes(),
    embedding: v.array(v.float64()),
  }).index('text', ['textHash']),
};
