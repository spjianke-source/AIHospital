import { v } from 'convex/values';
import { Id } from '../_generated/dataModel';
import { ActionCtx, internalQuery } from '../_generated/server';
import { LLMMessage, chatCompletion } from '../util/llm';
import * as memory from './memory';
import { api, internal } from '../_generated/api';
import * as embeddingsCache from './embeddingsCache';
import { GameId, conversationId, playerId } from '../aiTown/ids';
import { NUM_MEMORIES_TO_SEARCH } from '../constants';

const selfInternal = internal.agent.conversation;

export async function startConversationMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
): Promise<{ text: string; prompt: string }> {
  const { player, otherPlayer, agent, otherAgent, lastConversation } = await ctx.runQuery(
    selfInternal.queryPromptData,
    {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    },
  );
  // Optimize memory query to include broader context (symptoms, history)
  // rather than just the specific pair of people talking.
  const embedding = await embeddingsCache.fetch(
    ctx,
    `${player.name} 最近的对话和病历`,
  );

  const memories = await memory.searchMemories(
    ctx,
    player.id as GameId<'players'>,
    embedding,
    Number(process.env.NUM_MEMORIES_TO_SEARCH) || NUM_MEMORIES_TO_SEARCH,
  );

  const memoryWithOtherPlayer = memories.find(
    (m: memory.Memory) => m.data.type === 'conversation' && m.data.playerIds.includes(otherPlayerId),
  );

  let prompt: string[] = [];

  if (player.role === 'patient') {
    prompt = constructPatientPrompt(player, otherPlayer, agent, memories);
    // Add instruction for starting conversation
    prompt.push(`[指令]`);
    if (memoryWithOtherPlayer) {
       prompt.push(`作为一个病人自然地回应。确保在你的问候中包含关于之前对话的一些细节或问题。`);
    } else {
       prompt.push(`作为一个病人自然地回应。开始对话。`);
    }
     prompt.push(`不要过度解释。`);
  } else {
    // Dynamic Perception Logic for Intro
    const medicalRoles = ['doctor', 'Emergency room doctor', 'nurse', 'Desk nurse', 'inpatient nurse', 'diagnostic nurse', 'admin'];
    let targetName = otherPlayer.name;
    if (player.role && medicalRoles.includes(player.role) && otherPlayer.role === 'patient') {
        targetName = '一位病人';
    }

    prompt = [
      `你是 ${player.name}，你刚刚开始与 ${targetName} 对话。`,
    ];
    prompt.push(...agentPrompts(otherPlayer, agent, otherAgent ?? null, player.role));
    prompt.push(...rolePrompts(player, otherPlayer)); // Inject Role-Specific Prompts
    prompt.push(...previousConversationPrompt(otherPlayer, lastConversation));
    prompt.push(...relatedMemoriesPrompt(memories));
    if (memoryWithOtherPlayer) {
      prompt.push(
        `确保在你的问候中包含关于之前对话的一些细节或问题。`,
      );
    }
  }


  const lastPrompt = `${player.name} to ${otherPlayer.name}:`;
  prompt.push(lastPrompt);

  const llmMode = await ctx.runQuery(api.configuration.getLLMMode);
  const { content } = await chatCompletion({
    messages: [
      {
        role: 'system',
        content: prompt.join('\n'),
      },
    ],
    max_tokens: 300,
    stop: stopWords(otherPlayer.name, player.name),
    mode: llmMode as 'ollama' | 'api' | 'deepseek-reasoner',
  });
  return {
    text: trimContentPrefx(content, lastPrompt),
    prompt: prompt.join('\n')
  };
}

function trimContentPrefx(content: string, prompt: string) {
  if (content.startsWith(prompt)) {
    return content.slice(prompt.length).trim();
  }
  return content;
}

export async function continueConversationMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
): Promise<{ text: string; prompt: string }> {
  const { player, otherPlayer, conversation, agent, otherAgent } = await ctx.runQuery(
    selfInternal.queryPromptData,
    {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    },
  );
  const now = Date.now();
  const started = new Date(conversation.created);
  const embedding = await embeddingsCache.fetch(
    ctx,
    `${player.name} 最近的对话和病历`,
  );
  const memories = await memory.searchMemories(ctx, player.id as GameId<'players'>, embedding, 3);
  
  let prompt: string[] = [];

  if (player.role === 'patient') {
     prompt = constructPatientPrompt(player, otherPlayer, agent, memories);
     prompt.push(`[指令]`);
     prompt.push(`作为一个病人自然地回应。以下是当前的聊天记录。`);
     prompt.push(`不要过度解释。`);
  } else {
    // Dynamic Perception Logic for Continue
    const medicalRoles = ['doctor', 'Emergency room doctor', 'nurse', 'Desk nurse', 'inpatient nurse', 'diagnostic nurse', 'admin'];
    let targetName = otherPlayer.name;
    if (player.role && medicalRoles.includes(player.role) && otherPlayer.role === 'patient') {
         targetName = '一位病人';
    }

    prompt = [
      `你是 ${player.name}，你目前正在与 ${targetName} 对话。`,
      `对话开始于 ${started.toLocaleString()}。现在是 ${now.toLocaleString()}。`,
    ];
    prompt.push(...agentPrompts(otherPlayer, agent, otherAgent ?? null, player.role));
    prompt.push(...rolePrompts(player, otherPlayer)); // Inject Role-Specific Prompts
    prompt.push(...relatedMemoriesPrompt(memories));
  }
  


  if (player.role !== 'patient') {
      prompt.push(
        `以下是你和 ${otherPlayer.name} 之间的当前聊天记录。`,
        `不要再次问候他们。不要过于频繁地使用“嘿”这个词。你的回答应该简短。`,
      );
  }

  const llmMessages: LLMMessage[] = [
    {
      role: 'system',
      content: prompt.join('\n'),
    },
    ...(await previousMessages(
      ctx,
      worldId,
      player,
      otherPlayer,
      conversation.id as GameId<'conversations'>,
    )),
  ];
  const lastPrompt = `${player.name} to ${otherPlayer.name}:`;
  llmMessages.push({ role: 'user', content: lastPrompt });

  const llmMode = await ctx.runQuery(api.configuration.getLLMMode);
  const { content } = await chatCompletion({
    messages: llmMessages,
    max_tokens: 300,
    stop: stopWords(otherPlayer.name, player.name),
    mode: llmMode as 'ollama' | 'api' | 'deepseek-reasoner',
  });
  return {
    text: trimContentPrefx(content, lastPrompt),
    prompt: prompt.join('\n')
  };
}

function constructPatientPrompt(player: any, otherPlayer: any, agent: any, memories: any[]): string[] {
    const prompt = [];
    prompt.push(`[系统]`);
    prompt.push(`你是 ${player.name}，一位在医院寻求医疗护理的病人。`);
    
    prompt.push(`[身份]`);
    prompt.push(agent.identity); // Using the simplified identity from data/characters.ts

    prompt.push(`[对话约束]`);
    prompt.push(`- 你不知道工作人员的名字。`);
    prompt.push(`- 只能称呼他们为“医生”、“护士”或“你”。`);
    prompt.push(`- 严格专注于医疗问题。`);
    prompt.push(`- 保持回答简短（1-3句话）。`);
    prompt.push(`- 除非被直接触发，否则不要讨论无关的社交或法律话题。`);

    prompt.push(`[上下文]`);
    prompt.push(`你正在与一名医院工作人员交谈。`);
    prompt.push(`他们的角色是：${otherPlayer.role}。`);

    prompt.push(`[场景提示]`);
    const scenarioPrompts = rolePrompts(player, otherPlayer);
    if (scenarioPrompts.length > 0) {
        prompt.push(...scenarioPrompts);
    } else {
        prompt.push(`(没有可用的具体场景提示)`);
    }

    // Memories can be included as well if deemed relevant, though the user didn't explicitly list them in the simplified structure.
    // However, memories are crucial for context (e.g. previous diagnosis).
    // The user's request is "Simplified + De-redundant", but keeping relevant info is key.
    // I will add memories in a simplified way if they exist.
    if (memories && memories.length > 0) {
        prompt.push(`[相关记忆]`);
         for (const memory of memories) {
            prompt.push('- ' + memory.description);
         }
    }

    return prompt;
}

export async function leaveConversationMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
): Promise<string> {
  const { player, otherPlayer, conversation, agent, otherAgent } = await ctx.runQuery(
    selfInternal.queryPromptData,
    {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    },
  );
  const prompt = [
    `你是 ${player.name}，你目前正在与 ${otherPlayer.name} 对话。`,
    `你决定放弃这个问题，并想礼貌地告诉他们你要离开对话。`,
  ];
  prompt.push(...agentPrompts(otherPlayer, agent, otherAgent ?? null));
  prompt.push(
    `以下是你和 ${otherPlayer.name} 之间的当前聊天记录。`,
    `你想怎么告诉他们你要离开？你的回答应该简短，在200个字符以内。`,
  );
  const llmMessages: LLMMessage[] = [
    {
      role: 'system',
      content: prompt.join('\n'),
    },
    ...(await previousMessages(
      ctx,
      worldId,
      player,
      otherPlayer,
      conversation.id as GameId<'conversations'>,
    )),
  ];
  const lastPrompt = `${player.name} to ${otherPlayer.name}:`;
  llmMessages.push({ role: 'user', content: lastPrompt });

  const llmMode = await ctx.runQuery(api.configuration.getLLMMode);
  const { content } = await chatCompletion({
    messages: llmMessages,
    max_tokens: 300,
    stop: stopWords(otherPlayer.name, player.name),
    mode: llmMode as 'ollama' | 'api' | 'deepseek-reasoner',
  });
  return trimContentPrefx(content, lastPrompt);
}

const HOSPITAL_GLOBAL_CONTEXT = `
[医院全局上下文]
你是一家公立医院的医务人员。
我们医院目前有以下工作人员：

护士：
1. 住院护士 Emily
2. 诊断护士 Sarah
3. 前台护士 Pete

医生：
1. 急诊室医生 Bob
2. 门诊医生 Steve

管理员：
- 医院管理员 Kurt

你是这些工作人员中的一员。你严格按照你的职业角色行事，并对你自己的职责负责。
对话是专业的、简短的，并专注于医疗。
`;

function agentPrompts(
  otherPlayer: { name: string; role?: string },
  agent: { identity: string; plan: string } | null,
  otherAgent: { identity: string; plan: string } | null,
  playerRole?: string,
): string[] {
  const prompt = [];
  
  if (playerRole && ['doctor', 'Emergency room doctor', 'nurse', 'Desk nurse', 'inpatient nurse', 'diagnostic nurse', 'admin'].includes(playerRole)) {
      prompt.push(HOSPITAL_GLOBAL_CONTEXT);
  }

  if (agent) {
    prompt.push(`关于你: ${agent.identity}`);
    prompt.push(`你的对话目标: ${agent.plan}`);
  }
  
  // Dynamic Perception Logic
  const medicalRoles = ['doctor', 'Emergency room doctor', 'nurse', 'Desk nurse', 'inpatient nurse', 'diagnostic nurse', 'admin'];
  
  let targetDescription = `与 ${otherPlayer.name}`;
  
  if (playerRole && medicalRoles.includes(playerRole) && otherPlayer.role === 'patient') {
      targetDescription = `与一位病人`;
  }
  
  prompt.push(`你正在${targetDescription}交谈。`);
  
  if (otherPlayer.role) {
    prompt.push(`他们的角色是: ${otherPlayer.role}。`);
  }
  return prompt;
}

function previousConversationPrompt(
  otherPlayer: { name: string },
  conversation: { created: number } | null,
): string[] {
  const prompt = [];
  if (conversation) {
    const prev = new Date(conversation.created);
    const now = new Date();
    prompt.push(
      `上次你和 ${
        otherPlayer.name
      } 聊天是在 ${prev.toLocaleString()}。现在是 ${now.toLocaleString()}。`,
    );
  }
  return prompt;
}

function relatedMemoriesPrompt(memories: memory.Memory[]): string[] {
  const prompt = [];
  if (memories.length > 0) {
    prompt.push(`以下是按相关性降序排列的相关记忆：`);
    for (const memory of memories) {
      prompt.push(' - ' + memory.description);
    }
  }
  return prompt;
}

async function previousMessages(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  player: { id: string; name: string },
  otherPlayer: { id: string; name: string },
  conversationId: GameId<'conversations'>,
) {
  const llmMessages: LLMMessage[] = [];
  const prevMessages = await ctx.runQuery(api.messages.listMessages, { worldId, conversationId });
  for (const message of prevMessages) {
    const author = message.author === player.id ? player : otherPlayer;
    const recipient = message.author === player.id ? otherPlayer : player;
    llmMessages.push({
      role: 'user',
      content: `${author.name} to ${recipient.name}: ${message.text}`,
    });
  }
  return llmMessages;
}

export const queryPromptData = internalQuery({
  args: {
    worldId: v.id('worlds'),
    playerId,
    otherPlayerId: playerId,
    conversationId,
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new Error(`World ${args.worldId} not found`);
    }
    const player = world.players.find((p) => p.id === args.playerId);
    if (!player) {
      throw new Error(`Player ${args.playerId} not found`);
    }
    const playerDescription = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', args.playerId))
      .first();
    if (!playerDescription) {
      throw new Error(`Player description for ${args.playerId} not found`);
    }
    const otherPlayer = world.players.find((p) => p.id === args.otherPlayerId);
    if (!otherPlayer) {
      throw new Error(`Player ${args.otherPlayerId} not found`);
    }
    const otherPlayerDescription = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', args.otherPlayerId))
      .first();
    if (!otherPlayerDescription) {
      throw new Error(`Player description for ${args.otherPlayerId} not found`);
    }
    const conversation = world.conversations.find((c) => c.id === args.conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${args.conversationId} not found`);
    }
    const agent = world.agents.find((a) => a.playerId === args.playerId);
    if (!agent) {
      throw new Error(`Player ${args.playerId} not found`);
    }
    const agentDescription = await ctx.db
      .query('agentDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('agentId', agent.id))
      .first();
    if (!agentDescription) {
      throw new Error(`Agent description for ${agent.id} not found`);
    }
    const otherAgent = world.agents.find((a) => a.playerId === args.otherPlayerId);
    let otherAgentDescription;
    if (otherAgent) {
      otherAgentDescription = await ctx.db
        .query('agentDescriptions')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('agentId', otherAgent.id))
        .first();
      if (!otherAgentDescription) {
        throw new Error(`Agent description for ${otherAgent.id} not found`);
      }
    }
    const lastTogether = await ctx.db
      .query('participatedTogether')
      .withIndex('edge', (q) =>
        q
          .eq('worldId', args.worldId)
          .eq('player1', args.playerId)
          .eq('player2', args.otherPlayerId),
      )
      // Order by conversation end time descending.
      .order('desc')
      .first();

    let lastConversation = null;
    if (lastTogether) {
      lastConversation = await ctx.db
        .query('archivedConversations')
        .withIndex('worldId', (q) =>
          q.eq('worldId', args.worldId).eq('id', lastTogether.conversationId),
        )
        .first();
      if (!lastConversation) {
        throw new Error(`Conversation ${lastTogether.conversationId} not found`);
      }
    }


    return {
      player: { name: playerDescription.name, role: playerDescription.role, customPrompts: playerDescription.customPrompts, ...player },
      otherPlayer: { name: otherPlayerDescription.name, role: otherPlayerDescription.role, customPrompts: otherPlayerDescription.customPrompts, ...otherPlayer },
      conversation,
      agent: { identity: agentDescription.identity, plan: agentDescription.plan, ...agent },
      otherAgent: otherAgent && {
        identity: otherAgentDescription!.identity,
        plan: otherAgentDescription!.plan,
        ...otherAgent,
      },
      lastConversation,
      pendingStory: null,
    };
  },
});

function stopWords(otherPlayer: string, player: string) {
  // These are the words we ask the LLM to stop on. OpenAI only supports 4.
  const variants = [`${otherPlayer} to ${player}`];
  return variants.flatMap((stop) => [stop + ':', stop.toLowerCase() + ':']);
}

function rolePrompts(player: any, otherPlayer: any): string[] {
  const prompt: string[] = [];
  const playerRole = player.role;
  const otherPlayerRole = otherPlayer.role;
  const prompts = player.customPrompts || {};

  // 1. Desk nurse talking to Patient
  // 1. Desk nurse talking to Patient - Triage prompt usage removed as per request
  if (playerRole === 'Desk nurse' && otherPlayerRole === 'patient') {
      // Logic removed
  }

  // 2. Patient talking to Desk nurse - Prompt usage removed
  if (playerRole === 'patient' && otherPlayerRole === 'Desk nurse') {
      // Logic removed
  }

  // 3. Doctor talking to Patient - Prompt usage removed
  if (playerRole === 'doctor' && otherPlayerRole === 'patient') {
      // Logic removed
  }

  // 4. Patient talking to Doctor - Prompt usage removed
  if (playerRole === 'patient' && otherPlayerRole === 'doctor') {
      // Logic removed
  }

  // 5. Diagnostic Nurse talking to Patient - Prompt usage removed
  if (playerRole === 'diagnostic nurse' && otherPlayerRole === 'patient') {
      // Logic removed
  }

  // 6. Patient talking to Diagnostic Nurse - Prompt usage removed
  if (playerRole === 'patient' && otherPlayerRole === 'diagnostic nurse') {
      // Logic removed
  }

  // 7. Inpatient Nurse talking to Patient - Prompt usage removed
  if (playerRole === 'inpatient nurse' && otherPlayerRole === 'patient') {
      // Logic removed
  }

  // 8. Patient talking to Inpatient Nurse - Prompt usage removed
  if (playerRole === 'patient' && otherPlayerRole === 'inpatient nurse') {
      // Logic removed
  }

  return prompt;
}


