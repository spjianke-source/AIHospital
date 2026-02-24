import { v } from 'convex/values';
import { point } from '../util/types';
import { parseGameId, playerId } from './ids';
import { inputHandler } from './inputHandler';
import { movePlayer, stopPlayer } from './movement';
import { Agent } from './agent';
import { AgentDescription } from './agentDescription';
import { Player } from './player';

export const playerInputs = {
  join: inputHandler({
    args: {
      name: v.string(),
      character: v.string(),
      description: v.string(),
      tokenIdentifier: v.optional(v.string()),
    },
    handler: (game, now, args) => {
      Player.join(game, now, args.name, args.character, args.description, undefined, undefined, undefined, args.tokenIdentifier);
      return null;
    },
  }),
  leave: inputHandler({
    args: { playerId },
    handler: (game, now, args) => {
      const playerId = parseGameId('players', args.playerId);
      const player = game.world.players.get(playerId);
      if (!player) {
        throw new Error(`Invalid player ID ${playerId}`);
      }
      player.leave(game, now);
      return null;
    },
  }),
  moveTo: inputHandler({
    args: {
      playerId,
      destination: v.union(point, v.null()),
    },
    handler: (game, now, args) => {
      const playerId = parseGameId('players', args.playerId);
      const player = game.world.players.get(playerId);
      if (!player) {
        throw new Error(`Invalid player ID ${playerId}`);
      }
      if (args.destination) {
        movePlayer(game, now, player, args.destination);
      } else {
        stopPlayer(player);
      }
      return null;
    },
  }),
  updateStatus: inputHandler({
    args: {
      playerId,
      status: v.string(),
    },
    handler: (game, now, args) => {
      const playerId = parseGameId('players', args.playerId);
      const player = game.world.players.get(playerId);
      if (!player) throw new Error(`Invalid player ID ${playerId}`);
      player.status = args.status;
      return null;
    },
  }),
  control: inputHandler({
    args: {
      playerId,
      tokenIdentifier: v.string(),
    },
    handler: (game, now, args) => {
      const playerId = parseGameId('players', args.playerId);
      const player = game.world.players.get(playerId);
      if (!player) {
        throw new Error(`Invalid player ID ${playerId}`);
      }
      // Check if the user is already controlling *any* player in the world.
      for (const p of game.world.players.values()) {
        if (p.human === args.tokenIdentifier && p.id !== playerId) {
            throw new Error(`You are already controlling ${p.id}. Release them first!`);
        }
      }

      // If the target player is already controlled by another human (or same human re-taking), fail?
      // For now, we allow re-taking self (idempotent), but fail if someone else controls it.
      if (player.human && player.human !== args.tokenIdentifier) {
         throw new Error(`Player ${playerId} is already controlled by ${player.human}`);
      }
      
      // 1. Assign human controller
      player.human = args.tokenIdentifier;

      // 2. Remove AI Agent if it exists
      const agent = [...game.world.agents.values()].find(a => a.playerId === playerId);
      if (agent) {
        console.log(`Removing AI control from player ${playerId} (Agent ${agent.id})`);
        game.world.agents.delete(agent.id);
      }
      
      return null;
    },
  }),
  releaseControl: inputHandler({
    args: {
      playerId,
      tokenIdentifier: v.string(),
    },
    handler: (game, now, args) => {
        const playerId = parseGameId('players', args.playerId);
        const player = game.world.players.get(playerId);
        if (!player) {
            throw new Error(`Invalid player ID ${playerId}`);
        }
        
        if (player.human !== args.tokenIdentifier) {
            throw new Error(`Player ${playerId} is not controlled by you!`);
        }

        // 1. Remove human controller
        player.human = undefined;

        // 2. Restore AI Agent
        // Check if agent already exists (shouldn't, but safely check)
        const existingAgent = [...game.world.agents.values()].find(a => a.playerId === playerId);
        if (!existingAgent) {
            const agentId = game.allocId('agents');
            console.log(`Restoring AI control for player ${playerId} (New Agent ${agentId})`);
            const newAgent = new Agent({
                id: agentId,
                playerId: playerId,
                toRemember: undefined,
                lastConversation: undefined,
                lastInviteAttempt: undefined,
                inProgressOperation: undefined,
            });
            game.world.agents.set(agentId, newAgent);

            // 3. Restore Agent Description
            const playerDescription = game.playerDescriptions.get(playerId);
            if (!playerDescription) {
                throw new Error(`Player description not found for ${playerId}`);
            }
            game.agentDescriptions.set(
                agentId,
                new AgentDescription({
                    agentId: agentId,
                    identity: playerDescription.identity || "",
                    plan: playerDescription.plan || "",
                }),
            );
            game.descriptionsModified = true;
        }
        return null;
    },
  }),

  updatePlayerDescription: inputHandler({
    args: {
      playerId,
      identity: v.string(),
      plan: v.string(),
    },
    handler: (game, now, args) => {
      const playerId = parseGameId('players', args.playerId);
      
      // Get the current playerDescription from game memory
      const playerDescription = game.playerDescriptions.get(playerId);
      if (!playerDescription) {
        throw new Error(`Player description not found for ${playerId}`);
      }

      // Update game memory directly with the new values
      playerDescription.identity = args.identity;
      playerDescription.plan = args.plan;

      // Find the agent associated with this player
      const agent = Array.from(game.world.agents.values()).find(
        (a) => a.playerId === playerId
      );

      // If an agent exists, update its agentDescription to match
      if (agent) {
        game.agentDescriptions.set(
          agent.id,
          new AgentDescription({
            agentId: agent.id,
            identity: args.identity,
            plan: args.plan,
          }),
        );
      }

      // Mark that descriptions have been modified so they get saved to DB
      game.descriptionsModified = true;
      return null;
    },
  }),

  deletePlayer: inputHandler({
    args: { playerId },
    handler: (game, now, args) => {
      const playerId = parseGameId('players', args.playerId);
      const player = game.world.players.get(playerId);
      if (!player) {
         // Already gone? warn and ignore
         console.warn(`Player ${playerId} not found for deletion`);
         return null;
      }
      
      // 1. Remove from world.players (Engine state)
      // This stops them from ticking and rendering
      game.world.players.delete(playerId);
      
      // 2. Remove associated Agent if exists (Engine state)
      const agent = [...game.world.agents.values()].find(a => a.playerId === playerId);
      if (agent) {
        game.world.agents.delete(agent.id);
        // Remove from agentDescriptions (Engine memory)
        game.agentDescriptions.delete(agent.id);
      }
      
      // 3. Remove from playerDescriptions (Engine memory)
      game.playerDescriptions.delete(playerId);
      
      // 4. Mark descriptions as modified so saveDiff runs (though it only upserts)
      // This ensures that IF saveDiff logic changes to support delete, we are ready.
      // But mainly it ensures engine state is consistent.
      game.descriptionsModified = true;
      
      console.log(`Deleted player ${playerId} and associated data.`);
      return null;
    },
  }),
};
