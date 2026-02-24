import { v } from 'convex/values';
import { ActionCtx, DatabaseReader, action, internalAction, internalQuery } from '../_generated/server';
import { chatCompletion } from '../util/llm';
import { generateRandomPatient } from '../../src/lib/patientGenerator';
import { WorldMap, serializedWorldMap } from './worldMap';
import { rememberConversation } from '../agent/memory';
import { GameId, agentId, conversationId, playerId } from './ids';
import {
  continueConversationMessage,
  leaveConversationMessage,
  startConversationMessage,
} from '../agent/conversation';
import { assertNever } from '../util/assertNever';
import { serializedAgent } from './agent';
import { ACTIVITIES, ACTIVITY_COOLDOWN, CONVERSATION_COOLDOWN } from '../constants';
import { api, internal } from '../_generated/api';
import { sleep } from '../util/sleep';
import { serializedPlayer } from './player';
import { Descriptions } from '../../data/characters';

export const agentRememberConversation = internalAction({
  args: {
    worldId: v.id('worlds'),
    playerId,
    agentId,
    conversationId,
    operationId: v.string(),
  },
  handler: async (ctx, args) => {
    await rememberConversation(
      ctx,
      args.worldId,
      args.agentId as GameId<'agents'>,
      args.playerId as GameId<'players'>,
      args.conversationId as GameId<'conversations'>,
    );
    
    // Trigger Character Action Generation (Disabled to save tokens)
    /*
    await ctx.scheduler.runAfter(0, internal.agent.action.generateCharacterAction, {
        worldId: args.worldId,
        playerId: args.playerId,
        conversationId: args.conversationId,
    });
    */

    await sleep(Math.random() * 1000);
    await ctx.runMutation(api.aiTown.main.sendInput, {
      worldId: args.worldId,
      name: 'finishRememberConversation',
      args: {
        agentId: args.agentId,
        operationId: args.operationId,
      },
    });
  },
});

export const agentGenerateMessage = internalAction({
  args: {
    worldId: v.id('worlds'),
    playerId,
    agentId,
    conversationId,
    otherPlayerId: playerId,
    operationId: v.string(),
    type: v.union(v.literal('start'), v.literal('continue'), v.literal('leave')),
    messageUuid: v.string(),
  },
  handler: async (ctx, args) => {
    let completionFn;
    switch (args.type) {
      case 'start':
        completionFn = startConversationMessage;
        break;
      case 'continue':
        completionFn = continueConversationMessage;
        break;
      case 'leave':
        completionFn = leaveConversationMessage;
        break;
      default:
        assertNever(args.type);
    }
    try {
      const result = await completionFn(
        ctx,
        args.worldId,
        args.conversationId as GameId<'conversations'>,
        args.playerId as GameId<'players'>,
        args.otherPlayerId as GameId<'players'>,
      );
      
      let text, prompt;
      if (typeof result === 'string') {
          // Compatibility for leaveConversationMessage if not updated, or other handlers
          text = result;
      } else {
          text = result.text;
          prompt = result.prompt;
      }

      await ctx.runMutation(internal.aiTown.agent.agentSendMessage, {
        worldId: args.worldId,
        conversationId: args.conversationId,
        agentId: args.agentId,
        playerId: args.playerId,
        text,
        conversationPrompt: prompt,
        messageUuid: args.messageUuid,
        leaveConversation: args.type === 'leave',
        operationId: args.operationId,
      });
    } catch (e: any) {
      console.error('agentGenerateMessage failed: ' + e.message);
      // Send a fallback message to unlock the conversation state
      await ctx.runMutation(internal.aiTown.agent.agentSendMessage, {
        worldId: args.worldId,
        conversationId: args.conversationId,
        agentId: args.agentId,
        playerId: args.playerId,
        text: '...',
        messageUuid: args.messageUuid,
        leaveConversation: false,
        operationId: args.operationId,
      });
    }
  },
});

export const agentDoSomething = internalAction({
  args: {
    worldId: v.id('worlds'),
    player: v.object(serializedPlayer),
    agent: v.object(serializedAgent),
    map: v.object(serializedWorldMap),
    otherFreePlayers: v.array(v.object(serializedPlayer)),
    operationId: v.string(),
    role: v.optional(v.string()),
    gameTime: v.number(),
  },
  handler: async (ctx, args) => {
    // Add Jitter/Throttle to prevent Input Table contention (Concurrency Error)
    // Add Jitter/Throttle to prevent Input Table contention (Concurrency Error)
    await sleep(2000); // Fixed 2s delay as requested
    
    const { player, agent, role, gameTime } = args;
    const map = new WorldMap(args.map);
    const now = Date.now();
    // Don't try to start a new conversation if we were just in one.
    const justLeftConversation =
      agent.lastConversation && now < agent.lastConversation + CONVERSATION_COOLDOWN;
    // Don't try again if we recently tried to find someone to invite.
    const recentlyAttemptedInvite =
      agent.lastInviteAttempt && now < agent.lastInviteAttempt + CONVERSATION_COOLDOWN;

    // 1. Staff Logic (Doctors, Nurses, Admin) - Stationary & Facing Down
    if (role && role !== 'patient') {
        // Set Default Status for Staff
        let status = 'Working';
        
        // If they are in a conversation (which we can check via agent state indirectly, or wait for next tick)
        // Ideally we set status here. 
        // Note: The UI can override 'Working' with "..." if they are speaking, 
        // but let's persist the "Mode" here.
        
        if (role === 'Emergency room doctor' || role === 'doctor' || role === 'diagnostic nurse' || role === 'inpatient nurse') {
             // console.log('[StatusDebug] Agent ' + agent.id + ' (' + role + ') checking status. Current: ' + player.status + ', Target: ' + status);
        }
        
        if (player.status !== status) {
             // console.log('[StatusDebug] Updating status for ' + agent.id + ' to ' + status);
             await ctx.runMutation(api.aiTown.main.sendInput, {
                worldId: args.worldId,
                name: 'updateStatus', // We need to add this input handler!
                args: {
                    playerId: player.id,
                    status: status
                }
             });
        }

        const isMoving = player.pathfinding;
        
        // If already moving, let them finish
        if (isMoving) return;

        // If not moving, check if at starting position
        if (player.startingPosition) {
             const { x, y } = player.position;
             const { x: sx, y: sy } = player.startingPosition;
             
             // Check if close enough (simple distance check)
             const dist = Math.sqrt(Math.pow(x - sx, 2) + Math.pow(y - sy, 2));
             
             if (dist > 1) {
                 console.log('Agent ' + agent.id + ' (' + role + ') returning to start (' + sx + ', ' + sy + ').');
                 await ctx.runMutation(api.aiTown.main.sendInput, {
                    worldId: args.worldId,
                    name: 'finishDoSomething',
                    args: {
                        operationId: args.operationId,
                        agentId: agent.id,
                        destination: player.startingPosition,
                    },
                 });
                 return;
             }
             
             // If we are here, we are at the station (dist <= 1).
             // We MUST finish the operation, otherwise the agent is "busy" forever until timeout.
             // We can just "wait" here.
             await sleep(Math.random() * 2000 + 1000); // Wait 1-3 seconds
             await ctx.runMutation(api.aiTown.main.sendInput, {
                worldId: args.worldId,
                name: 'finishDoSomething',
                args: {
                    operationId: args.operationId,
                    agentId: agent.id,
                    destination: player.position, // Stay put
                },
             });
             return;
        }
    }

    // 2. Patient Logic - Social Search / Evaluation (Only for patients)
    // Non-patients skip this block entirely
    if ((!role || role === 'patient')) {
         
         // Update Patient Status based on their "intent" if we can derive it.
         // currently we don't have a persistent "intent" state until `patientDoSomething` runs.
         // BUT `agentDoSomething` is running for everyone.
         // Patients use `patientDoSomething` separately? 
         // Let's check where `patientDoSomething` is called. 
         // It seems `agentDoSomething` might only be called for generic agents?
         // In `convex/aiTown/main.ts` (implied), it calls `agentDoSomething`.
         
         // The user code I saw earlier had `patientDoSomething` definition at bottom of `agentOperations.ts`.
         // I need to ensure `patientDoSomething` sets the status.
         // So for this block, I will just ensure generic status is cleared or set if needed.
         // Actually, let's leave patient status logic to `patientDoSomething` if it exists and is used.
         // The previous `view_file` showed `patientDoSomething` exists.
         
         // If this agent is a patient, `agentDoSomething` might still run?
         // We should probably rely on `patientDoSomething` for patients.
         // Let's SKIP generic logic for patients here if `patientDoSomething` handles it.
         
         // If `role === 'patient'`, we proceed with original logic (wandering) inside here?
         // In my previous edit I restored wandering for patients.
         
         const invitee =
          justLeftConversation || recentlyAttemptedInvite
            ? undefined
            : await ctx.runQuery(internal.aiTown.agent.findConversationCandidate, {
                now,
                worldId: args.worldId,
                player: args.player,
                otherFreePlayers: args.otherFreePlayers,
              });

        if (invitee) {
            console.log('Agent ' + agent.id + ' found candidate ' + invitee + ' to talk to.');
            await sleep(Math.random() * 1000);
            await ctx.runMutation(api.aiTown.main.sendInput, {
                worldId: args.worldId,
                name: 'finishDoSomething',
                args: {
                    operationId: args.operationId,
                    agentId: args.agent.id,
                    invitee,
                },
            });
            return;
        }
        
        // Use wandering if no invitee
        if (!player.pathfinding) {
            console.log('Agent ' + agent.id + ' searching for social partner (wandering).');
            await sleep(Math.random() * 1000);
            await ctx.runMutation(api.aiTown.main.sendInput, {
            worldId: args.worldId,
            name: 'finishDoSomething',
            args: {
                operationId: args.operationId,
                agentId: agent.id,
                destination: wanderDestination(map),
            },
            });
        }
        return;
    }
  },
});

function wanderDestination(worldMap: WorldMap) {
  return {
    x: 1 + Math.floor(Math.random() * (worldMap.width - 2)),
    y: 1 + Math.floor(Math.random() * (worldMap.height - 2)),
  };
}

  export const getPatientState = internalQuery({
    args: {
      worldId: v.id('worlds'),
      playerId,
      otherFreePlayers: v.array(v.object(serializedPlayer)),
    },
    handler: async (ctx, args) => {
      try {
          const world = await ctx.db.get(args.worldId);
          if (!world) throw new Error('World not found');
    
          // 1. Get History (Last 2 conversations)
          // Fixed index name from 'player1' to 'edge' to match schema
          const lastParticipations = await ctx.db
            .query('participatedTogether')
            .withIndex('playerHistory', (q) => q.eq('worldId', args.worldId).eq('player1', args.playerId))
            .order('desc')
            .take(2);
          
          let lastConvoRole = null;
          let lastConvoTime = 0;
          let penultimateConvoRole = null;
          let lastConversationText = "";
    
          if (lastParticipations.length > 0) {
            const lastPart = lastParticipations[0];
            const otherPlayerId = lastPart.player2;
            const otherDesc = await ctx.db.query('playerDescriptions')
              .withIndex('worldId', q => q.eq('worldId', args.worldId).eq('playerId', otherPlayerId))
              .first();
            
            let otherRole = otherDesc?.role;
             if (!otherRole && otherDesc?.name) {
                 const staticDesc = Descriptions.find(d => d.name === otherDesc.name);
                 if (staticDesc) otherRole = staticDesc.role;
             }
    
            if (otherDesc) {
               lastConvoRole = otherRole ? otherRole.toLowerCase() : null;
               lastConvoTime = lastPart.ended;
            }
    
            // Fetch Conversation Text for LLM Decision (General)
            const conversationId = lastPart.conversationId;
            const messages = await ctx.db.query('messages')
                .withIndex('conversationId', q => q.eq('worldId', args.worldId).eq('conversationId', conversationId))
                .collect();
            lastConversationText = messages.map(m => m.text).join(' ');
    
            if (lastParticipations.length > 1) {
                 const penPart = lastParticipations[1];
                 const penDesc = await ctx.db.query('playerDescriptions')
                    .withIndex('worldId', q => q.eq('worldId', args.worldId).eq('playerId', penPart.player2))
                    .first();
                 
                  let penRole = penDesc?.role;
                  if (!penRole && penDesc?.name) {
                     const staticDesc = Descriptions.find(d => d.name === penDesc.name);
                     if (staticDesc) penRole = staticDesc.role;
                  }
    
                 if (penDesc) {
                    penultimateConvoRole = penRole ? penRole.toLowerCase() : null;
                 }
            }
          }
    
          // 2. Find Available Candidates by Role
          const candidates: Record<string, GameId<'players'>[]> = {
              'desk nurse': [],
              'doctor': [],
              'inpatient nurse': [],
              'diagnostic nurse': [],
              'emergency room doctor': []
          };
    
          for (const p of args.otherFreePlayers) {
              const desc = await ctx.db.query('playerDescriptions')
                .withIndex('worldId', q => q.eq('worldId', args.worldId).eq('playerId', p.id))
                .first();
              
              let role = desc?.role;
    
              // Fallback: If role is missing, look up by name in static data
              if (!role && desc?.name) {
                  const staticDesc = Descriptions.find(d => d.name === desc.name);
                  if (staticDesc && staticDesc.role) {
                      role = staticDesc.role;
                  }
              }
    
              if (role) {
                  const normalizedRole = role.toLowerCase();
                  if (candidates[normalizedRole]) {
                      candidates[normalizedRole].push(p.id as GameId<'players'>);
                  }
              }
          }
          // console.log('Debug: Candidates found: DeskNurse=' + candidates['desk nurse'].length + ', Doctor=' + candidates['doctor'].length + ', ER=' + candidates['emergency room doctor'].length + ', InpatientNurse=' + candidates['inpatient nurse'].length + ', DiagnosticNurse=' + candidates['diagnostic nurse'].length);


    
          const playerDescription = await ctx.db
              .query('playerDescriptions')
              .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
              .filter((q) => q.eq(q.field('playerId'), args.playerId))
              .first();
          
          const medicalRecord = playerDescription?.medicalRecord;

          return {
              lastConvoRole,
              lastConvoTime,
              penultimateConvoRole,
              lastConversationText, // Updated from deskNurseConversationText
              candidates,
              latestStoryTs: 0,
              medicalRecord // <--- Return Hard State
          };
      } catch (e: any) {
          console.error('getPatientState CRASHED:', e);
          return {
              lastConvoRole: null,
              lastConvoTime: 0,
              penultimateConvoRole: null,
              lastConversationText: "", // Updated
              candidates: { 'Desk nurse': [], doctor: [], 'inpatient nurse': [], 'diagnostic nurse': [], 'Emergency room doctor': [] },
              latestStoryTs: 0,
              medicalRecord: null
          };
      }
    }
  });

  export const patientDoSomething = internalAction({
    args: {
        worldId: v.id('worlds'),
        player: v.object(serializedPlayer),
        agent: v.object(serializedAgent),
        map: v.object(serializedWorldMap),
        otherFreePlayers: v.array(v.object(serializedPlayer)),
        operationId: v.string(),
        role: v.optional(v.string()), // Self role
    },
    handler: async (ctx, args) => {
        // Add Jitter/Throttle to prevent Input Table contention (Concurrency Error)
        // Add Jitter/Throttle to prevent Input Table contention (Concurrency Error)
        await sleep(2000); // Fixed 2s delay as requested

        console.log('>>> patientDoSomething for', {
            agentId: args.agent.id,
            playerId: args.player.id,
            role: args.role,
        });

        const state = await ctx.runQuery(internal.aiTown.agentOperations.getPatientState, {
            worldId: args.worldId,
            playerId: args.player.id,
            otherFreePlayers: args.otherFreePlayers
        });

        // Check for cooldown (prevent spamming invites)
        const now = Date.now();
        const recentlyAttemptedInvite = args.agent.lastInviteAttempt && now < args.agent.lastInviteAttempt + CONVERSATION_COOLDOWN;
        if (recentlyAttemptedInvite) {
             console.log('Patient ' + args.agent.id + ' in invite cooldown. Waiting...');
             await ctx.runMutation(api.aiTown.main.sendInput, {
                worldId: args.worldId,
                name: 'finishDoSomething',
                args: {
                    operationId: args.operationId,
                    agentId: args.agent.id,
                    destination: args.player.position, // Wait here
                },
             });
             return;
        }
        // Relaxed check: Within 1.5 tiles of (46, 56) to account for pathfinding precision
        if (Math.abs(args.player.position.x - 46) < 1.5 && Math.abs(args.player.position.y - 56) < 1.5 && args.player.status === '离院') {
             console.log('Patient ' + args.agent.id + ' confirmed at Exit (46, 56). Deleting patient.');
             
             // DELETE PLAYER (No Respawn)
             await ctx.runMutation(api.world.deletePlayer, {
                worldId: args.worldId,
                playerId: args.player.id, // ID is already typed correctly in schema usually, but api args might need string
             });
             return;
        }


        let targetRole = 'desk nurse';
        let nextStatus = '分诊中';
        let diagnosis = 'outpatient'; 

        // CRITICAL FIX: If already resting/sightseeing, SKIP LLM entirely.
        // Otherwise LLM (or fallback) overwrites status to '分诊中', causing loop.
        const isIdle = args.player.status === '休息' || args.player.status === '看景色';
        
        if (!isIdle) {
            if (!state.lastConvoRole) {
                // Case 1: New patient (No history) -> Go see Desk nurse
                targetRole = 'desk nurse';
                nextStatus = '分诊中';
                // console.log('Patient ' + args.agent.id + ' has no history. Defaulting to Desk Nurse.');
            } else if (state.lastConversationText) {
                 // Case 2: Has history -> Use LLM to decide next step
                 console.log('Patient ' + args.agent.id + ' consulting LLM for next step based on conversation...');
                 try {
                    // Heuristic: If last role was diagnostic nurse, strongly suggest going back to doctor
                    let postCheckupHint = "";
                    if (state.lastConvoRole === 'diagnostic nurse') {
                        postCheckupHint = "\n\n重要提示：你刚刚完成了检查（diagnostic nurse），请根据病情拿着报告回去找【门诊】或【急诊】医生复诊。除非医生让你再次检查，否则不要再去检查。";
                    }

                    // Strict output instruction: exact Chinese keywords
                    const medicalStatePrompt = state.medicalRecord ? `
    状态 (只读) - 你必须遵守以下内容:
    - 症状: ${state.medicalRecord.symptoms.join(', ')}
    - 生命体征: 血压 ${state.medicalRecord.vitals.blood_pressure}, 心率 ${state.medicalRecord.vitals.heart_rate}, 体温 ${state.medicalRecord.vitals.temperature}C
    - 化验: 验血 (${state.medicalRecord.labs.blood_test}), CT (${state.medicalRecord.labs.ct_scan})
    - 诊断: ${state.medicalRecord.diagnosis_hypothesis.length > 0 ? state.medicalRecord.diagnosis_hypothesis.join(', ') : '无'}
    - 治疗: ${state.medicalRecord.treatment_plan?.medication || '无'}

    规则:
    1. 不要捏造新的症状或检查结果。
    2. 如果化验是 'not_done'，你不知道结果。
    3. 只有提到的症状存在。
    ` : "";

                    const prompt = `你是患者的大脑。${medicalStatePrompt}\n根据与最近对话记录，决定下一步该去找谁。\n如果不清楚，或者对话结束，或者没有明确下一步，请根据情境判断。${postCheckupHint}\n可选指令：\n- 急诊 (去急诊室找 Emergency Room Doctor)\n- 门诊 (去诊室找 Outpatient Doctor)\n- 检查 (去检查室找 Diagnostic Nurse)\n- 住院 (去病房找 Inpatient Nurse)\n- 离院 (离开医院)\n\n严格只返回以上提到的两个中文字符的词，不要有任何其他标点或解释。\n\n最近对话记录:\n${state.lastConversationText}`;
                    
                    const llmMode = await ctx.runQuery(api.configuration.getLLMMode);
                    const { content } = await chatCompletion({
                        messages: [
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 10,
                        temperature: 0,
                        mode: llmMode as 'ollama' | 'api' | 'deepseek-reasoner',
                    });
                    
                    const result = content.trim();
                    // console.log('LLM Navigation Decision for ' + args.agent.id + ': "' + result + '"');

                    if (result.includes('急诊')) {
                        targetRole = 'emergency room doctor';
                        diagnosis = 'emergency';
                        nextStatus = '急诊';
                    } else if (result.includes('门诊')) {
                        targetRole = 'doctor'; // Steve
                        diagnosis = 'outpatient';
                        nextStatus = '门诊';
                    } else if (result.includes('检查')) {
                        targetRole = 'diagnostic nurse';
                        nextStatus = '检查';
                    } else if (result.includes('住院')) {
                        targetRole = 'inpatient nurse';
                        nextStatus = '住院';
                    } else if (result.includes('离院')) {
                        targetRole = 'stop';
                        nextStatus = '离院';
                    } else {
                        // Fallback
                        console.log('LLM returned unknown command "' + result + '". Fallback to Desk Nurse.');
                        targetRole = 'desk nurse';
                        nextStatus = '分诊中';
                    }

                 } catch (e) {
                     console.error('LLM Navigation Logic Failed', e);
                     targetRole = 'desk nurse'; // Safe fallback
                     nextStatus = '分诊中';
                 }
             } else {
                  // Case 1: No history / Default
                  nextStatus = '分诊中';
             }
        } // End if (!isIdle)


        // --- DICE ROLL LOGIC ---
        // Patient rolls dice to decide next action:
        // - 15% chance: Execute main task (medical workflow)
        // - 42.5% chance: Rest for 10 seconds
        // - 42.5% chance: Look at scenery for 10 seconds
        // Once a task is chosen, patient won't re-roll until task completes.

        const currentStatus = args.player.status;
        
        // Check if player has an active (not expired) activity
        const hasActiveActivity = args.player.activity && args.player.activity.until > now;
        
        // Check if player is walking to a rest/sightseeing destination
        const isWalkingToIdle = args.player.pathfinding && 
                                (currentStatus === '休息' || currentStatus === '看景色');
        
        // Check if player is executing a medical task (don't interrupt!)
        const medicalStatuses = ['分诊中', '门诊', '急诊', '检查', '住院', '离院'];
        const isExecutingMedicalTask = currentStatus && medicalStatuses.includes(currentStatus);
        
        let shouldIdle = false;
        let idleType = 'rest'; // default

        // Continue the same activity if:
        // 1. Still actively executing (activity not expired), OR
        // 2. Walking to the destination (pathfinding exists and status is rest/sightseeing), OR
        // 3. Executing a medical task
        if ((hasActiveActivity || isWalkingToIdle) && currentStatus === '休息') {
            // Still resting or walking to rest area
            shouldIdle = true;
            idleType = 'rest';
            if (isWalkingToIdle && !hasActiveActivity) {
                // console.log(`Patient ${args.agent.id} is walking to REST location...`);
            }
        } else if ((hasActiveActivity || isWalkingToIdle) && currentStatus === '看景色') {
            // Still sightseeing or walking to sightseeing zone
            shouldIdle = true;
            idleType = 'sightseeing';
            if (isWalkingToIdle && !hasActiveActivity) {
                console.log(`Patient ${args.agent.id} is walking to SIGHTSEEING location...`);
            }
        } else if (isExecutingMedicalTask) {
            // Patient is executing medical task - skip dice roll, continue with medical workflow
            // console.log(`Patient ${args.agent.id} is executing medical task (${currentStatus}), continuing...`);
            shouldIdle = false;
            // Don't roll dice - let the medical workflow logic below handle it
        } else {
            // No active task - roll the dice for new action
            // const diceRoll = Math.random();
            // console.log(`Patient ${args.agent.id} rolling dice: ${diceRoll.toFixed(3)}`);
             const diceRoll = Math.random();
            
            if (diceRoll < 0.15) {
                // 15% chance: Do main task
                // console.log(`Patient ${args.agent.id} rolled MAIN TASK (${diceRoll.toFixed(3)} < 0.15)`);
                shouldIdle = false;
            } else if (diceRoll < 0.575) {
                // 42.5% chance: Rest (0.15 to 0.575 = 0.425)
                // console.log(`Patient ${args.agent.id} rolled REST (0.15 <= ${diceRoll.toFixed(3)} < 0.575)`);
                shouldIdle = true;
                idleType = 'rest';
            } else {
                // 42.5% chance: Sightseeing (0.575 to 1.0 = 0.425)
                // console.log(`Patient ${args.agent.id} rolled SIGHTSEEING (${diceRoll.toFixed(3)} >= 0.575)`);
                shouldIdle = true;
                idleType = 'sightseeing';
            }
        }

        if (shouldIdle) {
             if (idleType === 'rest') {
                    // --- REST AT SEATS ---
                    const seats = [
                        {x:55,y:37}, {x:57,y:37}, {x:58,y:37}, {x:60,y:37}, {x:61,y:37},
                        {x:40,y:37}, {x:38,y:37}, {x:37,y:37}, {x:35,y:37}, {x:34,y:37},
                    ];
                    
                    const nearSeat = seats.find(s =>
                        Math.abs(args.player.position.x - s.x) < 1.5 &&
                        Math.abs(args.player.position.y - s.y) < 1.5
                    );

                    // Ensure status is set (idempotent)
                    if (currentStatus !== '休息') {
                        await ctx.runMutation(api.aiTown.main.sendInput, {
                            worldId: args.worldId,
                            name: 'updateStatus',
                            args: { playerId: args.player.id, status: '休息' },
                        });
                    }

                    if (nearSeat) {
                        // At seat - start 10s activity
                        console.log('Patient ' + args.agent.id + ' resting at seat.');
                        await ctx.runMutation(api.aiTown.main.sendInput, {
                            worldId: args.worldId,
                            name: 'finishDoSomething',
                            args: {
                                operationId: args.operationId,
                                agentId: args.agent.id,
                                activity: {
                                    description: '休息中',
                                    emoji: '',
                                    until: Date.now() + 10000,
                                },
                            },
                        });
                    } else if (args.player.pathfinding) {
                        // Already walking to a seat - don't change destination, just wait
                        // console.log('Patient ' + args.agent.id + ' is already walking to seat, waiting...');
                        await ctx.runMutation(api.aiTown.main.sendInput, {
                            worldId: args.worldId,
                            name: 'finishDoSomething',
                            args: {
                                operationId: args.operationId,
                                agentId: args.agent.id,
                                // No destination - keep current pathfinding
                            },
                        });
                    } else {
                        // Not at seat and not walking - select a seat and start walking
                        const seat = seats[Math.floor(Math.random() * seats.length)];
                        console.log('Patient ' + args.agent.id + ' selecting seat at (' + seat.x + ', ' + seat.y + ')');
                        await ctx.runMutation(api.aiTown.main.sendInput, {
                            worldId: args.worldId,
                            name: 'finishDoSomething',
                            args: {
                                operationId: args.operationId,
                                agentId: args.agent.id,
                                destination: seat,
                            },
                        });
                    }
             } else {
                    // --- SIGHTSEEING ---
                    const sceneryPoint = {
                        x: Math.floor(1 + Math.random() * 93),
                        y: Math.floor(49 + Math.random() * 10),
                    };
                    const inSceneryZone =
                        args.player.position.x >= 1 && args.player.position.x <= 94 &&
                        args.player.position.y >= 49 && args.player.position.y <= 59;

                    // Ensure status is set (idempotent)
                    if (currentStatus !== '看景色') {
                        await ctx.runMutation(api.aiTown.main.sendInput, {
                            worldId: args.worldId,
                            name: 'updateStatus',
                            args: { playerId: args.player.id, status: '看景色' },
                        });
                    }

                    if (inSceneryZone) {
                        // In scenery zone - start 10s activity
                        console.log('Patient ' + args.agent.id + ' enjoying scenery.');
                        await ctx.runMutation(api.aiTown.main.sendInput, {
                            worldId: args.worldId,
                            name: 'finishDoSomething',
                            args: {
                                operationId: args.operationId,
                                agentId: args.agent.id,
                                activity: {
                                    description: '看景色',
                                    emoji: '',
                                    until: Date.now() + 10000,
                                },
                            },
                        });
                    } else if (args.player.pathfinding) {
                        // Already walking to scenery zone - don't change destination, just wait
                        console.log('Patient ' + args.agent.id + ' is already walking to scenery, waiting...');
                        await ctx.runMutation(api.aiTown.main.sendInput, {
                            worldId: args.worldId,
                            name: 'finishDoSomething',
                            args: {
                                operationId: args.operationId,
                                agentId: args.agent.id,
                                // No destination - keep current pathfinding
                            },
                        });
                    } else {
                        // Not in scenery zone and not walking - select point and start walking
                        console.log('Patient ' + args.agent.id + ' selecting scenery point at (' + sceneryPoint.x + ', ' + sceneryPoint.y + ')');
                        await ctx.runMutation(api.aiTown.main.sendInput, {
                            worldId: args.worldId,
                            name: 'finishDoSomething',
                            args: {
                                operationId: args.operationId,
                                agentId: args.agent.id,
                                destination: sceneryPoint,
                            },
                        });
                    }
             }
             return; // End of Idle Logic
        }

        // --- EXECUTE MEDICAL TARGET LOGIC ---
        // If we didn't go idle, commit to the new status
        await ctx.runMutation(api.aiTown.main.sendInput, {
            worldId: args.worldId,
            name: 'updateStatus',
            args: { playerId: args.player.id, status: nextStatus },
        });



        
        if (targetRole === 'stop') {
             // Stay put / Leave logic
             console.log('Patient ' + args.agent.id + ' decided to LEAVE/STOP. Moving to Exit (34, 9).');
             await ctx.runMutation(api.aiTown.main.sendInput, {
                worldId: args.worldId,
                name: 'finishDoSomething',
                args: {
                    operationId: args.operationId,
                    agentId: args.agent.id,
                    destination: { x: 46, y: 56 }, // Move to exit
                },
             });
             return;
        }

        // Find best candidate for targetRole
        const potentialIds = state.candidates[targetRole] || [];
        
        let targetId = null;
        let minDist = Infinity;
        
        for (const pid of potentialIds) {
            const p = args.otherFreePlayers.find(pl => pl.id === pid);
            if (p) {
                const d = Math.sqrt(Math.pow(p.position.x - args.player.position.x, 2) + Math.pow(p.position.y - args.player.position.y, 2));
                if (d < minDist) {
                    minDist = d;
                    targetId = pid;
                }
            }
        }

        if (targetId) {
             // console.log('Patient ' + args.agent.id + ' decided to talk to ' + targetRole + ' (' + targetId + ')');
             await sleep(Math.random() * 1000);
             
             // Check distance to target
             const targetPlayer = args.otherFreePlayers.find(p => p.id === targetId);
             let shouldWalk = false;
             if (targetPlayer) {
                 const dist = Math.sqrt(Math.pow(targetPlayer.position.x - args.player.position.x, 2) + Math.pow(targetPlayer.position.y - args.player.position.y, 2));
                 
                 // Dynamic Walk Threshold
                 let walkThreshold = 2;
                 if (targetRole === 'desk nurse') walkThreshold = 4.5;
                 if (targetRole === 'inpatient nurse') walkThreshold = 5.5;

                 if (dist > walkThreshold) {
                     shouldWalk = true;
                 }
             }

             if (shouldWalk && targetPlayer) {
                 // console.log('Patient ' + args.agent.id + ' is too far (' + targetPlayer.position.x + ', ' + targetPlayer.position.y + '), walking to target first.');
                 await ctx.runMutation(api.aiTown.main.sendInput, {
                    worldId: args.worldId,
                    name: 'finishDoSomething',
                    args: {
                        operationId: args.operationId,
                        agentId: args.agent.id,
                        destination: {
                            x: Math.floor(targetPlayer.position.x),
                            y: Math.floor(targetPlayer.position.y)
                        }
                    },
                 });
             } else {
                 console.log('Patient ' + args.agent.id + ' is close enough, inviting ' + targetId + '.');
                 await ctx.runMutation(api.aiTown.main.sendInput, {
                    worldId: args.worldId,
                    name: 'finishDoSomething',
                    args: {
                        operationId: args.operationId,
                        agentId: args.agent.id,
                        invitee: targetId,
                    },
                 });
             }
        } else {
             // Wandering disabled. Stay put and wait.
             console.log('Patient ' + args.agent.id + ' wanted ' + targetRole + ' but none free/found. Waiting.');
             await sleep(Math.random() * 1000);
             await ctx.runMutation(api.aiTown.main.sendInput, {
                worldId: args.worldId,
                name: 'finishDoSomething',
                args: {
                    operationId: args.operationId,
                    agentId: args.agent.id,
                    destination: args.player.position, // Wait here
                },
             });
        }
    }
  });



export const suggestMessage = action({
  args: {
    worldId: v.id('worlds'),
    playerId,
    conversationId,
  },
  handler: async (ctx: ActionCtx, args: { worldId: any, playerId: string, conversationId: string }): Promise<string> => {
    // 1. Fetch Conversation History
    const messages = await ctx.runQuery(internal.messages.listMessages, {
      worldId: args.worldId,
      conversationId: args.conversationId as GameId<'conversations'>,
    });

    // 2. Fetch Player Description (Identity)
    const playerDescription = await ctx.runQuery(internal.aiTown.playerDescription.getPlayerDescription, {
        worldId: args.worldId,
        playerId: args.playerId as GameId<'players'>,
    });

    if (!playerDescription) {
        throw new Error("Player description not found");
    }

    // 3. Construct Prompt
    const prompt = `You are playing the role of ${playerDescription.name}.
Identity: ${playerDescription.identity}
Plan: ${playerDescription.plan}

You are in a conversation. Here is the history:
${messages.map((m: any) => `${m.authorName}: ${m.text}`).join('\n')}

Please suggest a short, natural response (1-2 sentences) for ${playerDescription.name} to say next.
Only return the response text, nothing else.`;

    // 4. Call LLM
    const llmMode = await ctx.runQuery(api.configuration.getLLMMode);
    const { content } = await chatCompletion({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.7,
        mode: llmMode as 'ollama' | 'api' | 'deepseek-reasoner',
    });

    return content.trim();
  },
});
