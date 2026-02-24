import { v } from 'convex/values';
import { inputHandler } from './inputHandler';
import { Player } from './player';
import { Agent } from './agent';
import { AgentDescription } from './agentDescription';
import { Descriptions } from '../../data/characters';

export const patientInputs = {
  respawnPatient: inputHandler({
    args: {
      name: v.string(),
      identity: v.string(),
      character: v.string(),
    },
    handler: (game, now, args) => {
        // Random character appearance from f1-f11
        const randomChar = `f${Math.floor(Math.random() * 11) + 1}`;
        
        // Find default patient template for prompts
        const patientTemplate = Descriptions.find(d => d.role === 'patient');
        const customPrompts = (patientTemplate as any)?.customPrompts;

        // Generate Hard State (Medical Record)
        const medicalRecord = {
            symptoms: [
              args.identity.includes('suffering from ') 
                ? args.identity.split('suffering from ')[1].split('.')[0] 
                : 'General Checkup' // Fallback for manual inputs
            ],
            vitals: {
                temperature: (36.5 + Math.random() * 3).toFixed(1),
                heart_rate: Math.floor(60 + Math.random() * 60),
                blood_pressure: `${Math.floor(90 + Math.random() * 40)}/${Math.floor(60 + Math.random() * 20)}`
            },
            labs: {
                blood_test: 'not_done',
                ct_scan: 'not_done',
                urinalysis: 'not_done'
            },
            diagnosis_hypothesis: [],
            treatment_plan: {
                medication: 'none',
                status: 'pending'
            }
        };

        const playerId = Player.join(
            game, 
            now, 
            args.name, 
            randomChar, 
            "A patient seeking medical help.", // Standard description
            args.identity,
            "Get medical help", // Plan
            'patient', // Role
            undefined, // No human token
            undefined, // Random position
            customPrompts,
            medicalRecord // <--- Injected Hard State
        );

        // 3. Create Agent for the new patient (Brain)
        const agentId = game.allocId('agents');
        game.world.agents.set(
          agentId,
          new Agent({
            id: agentId,
            playerId: playerId,
            inProgressOperation: undefined,
            lastConversation: undefined,
            lastInviteAttempt: undefined,
            toRemember: undefined,
          }),
        );
        game.agentDescriptions.set(
          agentId,
          new AgentDescription({
            agentId: agentId,
            identity: args.identity,
            plan: "Get medical help",
          }),
        );
        game.descriptionsModified = true;

        // console.log(`Spawned new patient ${args.name} (p:${playerId}, a:${agentId}) at random position`);
        return null;
    },
  }),
};
