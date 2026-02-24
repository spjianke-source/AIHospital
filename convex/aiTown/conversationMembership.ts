import { ObjectType, v } from 'convex/values';
import { GameId, parseGameId, playerId } from './ids';

export const serializedConversationMembership = {
  playerId,
  invited: v.number(),
  invitedGameTime: v.optional(v.number()),
  status: v.union(
    v.object({ kind: v.literal('invited') }),
    v.object({ kind: v.literal('walkingOver') }),
    v.object({ kind: v.literal('participating'), started: v.number(), startedGameTime: v.optional(v.number()) }),
  ),
};
export type SerializedConversationMembership = ObjectType<typeof serializedConversationMembership>;

export class ConversationMembership {
  playerId: GameId<'players'>;
  invited: number;
  invitedGameTime?: number;
  status:
    | { kind: 'invited' }
    | { kind: 'walkingOver' }
    | { kind: 'participating'; started: number; startedGameTime?: number };

  constructor(serialized: SerializedConversationMembership) {
    const { playerId, invited, invitedGameTime, status } = serialized;
    this.playerId = parseGameId('players', playerId);
    this.invited = invited;
    this.invitedGameTime = invitedGameTime;
    this.status = status;
  }

  serialize(): SerializedConversationMembership {
    const { playerId, invited, invitedGameTime, status } = this;
    return {
      playerId,
      invited,
      invitedGameTime,
      status,
    };
  }
}
