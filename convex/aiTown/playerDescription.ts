import { ObjectType, v } from 'convex/values';
import { GameId, parseGameId, playerId } from './ids';

export const serializedPlayerDescription = {
  playerId,
  name: v.string(),
  description: v.string(),
  identity: v.optional(v.string()),
  plan: v.optional(v.string()),
  character: v.string(),
  role: v.optional(v.string()),
  customPrompts: v.optional(v.any()),
  medicalRecord: v.optional(v.any()),
};
export type SerializedPlayerDescription = ObjectType<typeof serializedPlayerDescription>;

export class PlayerDescription {
  playerId: GameId<'players'>;
  name: string;
  description: string;
  identity?: string;
  plan?: string;
  character: string;
  role?: string;
  customPrompts?: any;
  medicalRecord?: any;

  constructor(serialized: SerializedPlayerDescription) {
    const { playerId, name, description, identity, plan, character, role, customPrompts, medicalRecord } = serialized;
    this.playerId = parseGameId('players', playerId);
    this.name = name;
    this.description = description;
    this.identity = identity;
    this.plan = plan;
    this.character = character;
    this.role = role;
    this.customPrompts = customPrompts;
    this.medicalRecord = medicalRecord;
  }

  serialize(): SerializedPlayerDescription {
    const { playerId, name, description, identity, plan, character, role, customPrompts, medicalRecord } = this;
    return {
      playerId,
      name,
      description,
      identity,
      plan,
      character,
      role,
      customPrompts,
      medicalRecord,
    };
  }
}

import { internalQuery } from '../_generated/server';

export const getPlayerDescription = internalQuery({
  args: {
    worldId: v.id('worlds'),
    playerId,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', args.playerId))
      .first();
  },
});
