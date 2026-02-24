import clsx from 'clsx';
import { Doc, Id } from '../../convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MessageInput } from './MessageInput';
import { Player } from '../../convex/aiTown/player';
import { Conversation } from '../../convex/aiTown/conversation';
import { useEffect, useRef, useState } from 'react';
import { formatGameTime } from '../utils/time';
import { createPortal } from 'react-dom';

export function Messages({
  worldId,
  engineId,
  conversation,
  inConversationWithMe,
  humanPlayer,
  scrollViewRef,
}: {
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
  conversation:
    | { kind: 'active'; doc: Conversation }
    | { kind: 'archived'; doc: Doc<'archivedConversations'> };
  inConversationWithMe: boolean;
  humanPlayer?: Player;
  scrollViewRef: React.RefObject<HTMLDivElement>;
}) {
  const humanPlayerId = humanPlayer?.id;
  const descriptions = useQuery(api.world.gameDescriptions, { worldId });
  const messages = useQuery(api.messages.listMessages, {
    worldId,
    conversationId: conversation.doc.id,
  });
  let currentlyTyping = conversation.kind === 'active' ? conversation.doc.isTyping : undefined;
  if (messages !== undefined && currentlyTyping) {
    if (messages.find((m) => m.messageUuid === currentlyTyping!.messageUuid)) {
      currentlyTyping = undefined;
    }
  }
  const currentlyTypingName =
    descriptions?.playerDescriptions.find((p) => p.playerId === currentlyTyping?.playerId)?.name;
  
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  const scrollView = scrollViewRef.current;
  const isScrolledToBottom = useRef(false);
  useEffect(() => {
    if (!scrollView) return undefined;

    const onScroll = () => {
      isScrolledToBottom.current = !!(
        scrollView && scrollView.scrollHeight - scrollView.scrollTop - 50 <= scrollView.clientHeight
      );
    };
    scrollView.addEventListener('scroll', onScroll);
    return () => scrollView.removeEventListener('scroll', onScroll);
  }, [scrollView]);
  useEffect(() => {
    if (isScrolledToBottom.current) {
      scrollViewRef.current?.scrollTo({
        top: scrollViewRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, currentlyTyping]);

  if (messages === undefined) {
    return null;
  }
  if (messages.length === 0 && !inConversationWithMe) {
    return <div className="text-center text-slate-400 italic p-4 bg-white/30 m-4 rounded-lg border border-dashed border-slate-200">No messages recorded</div>;
  }
  const messageNodes: { time: number; node: React.ReactNode }[] = messages.map((m) => {
    const node = (
      <div key={`text-${m._id}`} className="leading-tight mb-4 group relative">
        <div className="flex gap-4 items-baseline mb-1 px-1">
          <span className="uppercase font-bold text-[10px] text-slate-400 flex-grow tracking-wide">{m.authorName}</span>
          <time dateTime={m._creationTime.toString()} className="text-[10px] text-slate-400 font-mono">
            {m.gameTime ? formatGameTime(m.gameTime) : new Date(m._creationTime).toLocaleTimeString()}
          </time>
        </div>
        <div 
          className={clsx('bubble', m.author === humanPlayerId && 'bubble-mine', (m as any).conversationPrompt && 'cursor-pointer hover:ring-2 hover:ring-sky-200 active:scale-95')}
          onClick={() => {
            if ((m as any).conversationPrompt) {
              setSelectedPrompt((m as any).conversationPrompt);
            }
          }}
          title={(m as any).conversationPrompt ? "Click to view LLM Prompt" : undefined}
        >
          <p className="text-sm leading-relaxed">{m.text}</p>
        </div>
      </div>
    );
    return { node, time: m._creationTime };
  });
  const lastMessageTs = messages.map((m) => m._creationTime).reduce((a, b) => Math.max(a, b), 0);

  const membershipNodes: typeof messageNodes = [];
  if (conversation.kind === 'active') {
    for (const [playerId, m] of conversation.doc.participants) {
      const playerName = descriptions?.playerDescriptions.find((p) => p.playerId === playerId)
        ?.name;
      let started;
      let startedGameTime;
      if (m.status.kind === 'participating') {
        started = m.status.started;
        startedGameTime = m.status.startedGameTime;
      }
      if (started) {
        membershipNodes.push({
          node: (
            <div key={`joined-${playerId}`} className="leading-tight mb-4 mt-2">
              <p className="text-indigo-600 text-[10px] uppercase font-bold text-center tracking-widest px-2 border-b border-indigo-100 pb-1">
                {playerName} connected {startedGameTime ? formatGameTime(startedGameTime) : new Date(started).toLocaleTimeString()}
              </p>
            </div>
          ),
          time: started,
        });
      }
    }
  } else {
    for (const playerId of conversation.doc.participants) {
      const playerName = descriptions?.playerDescriptions.find((p) => p.playerId === playerId)
        ?.name;
      const started = conversation.doc.created;
      
      const startedGameTime = (conversation.doc as any).createdGameTime; 

      membershipNodes.push({
        node: (
          <div key={`joined-${playerId}`} className="leading-tight mb-4 mt-2">
            <p className="text-indigo-600 text-[10px] uppercase font-bold text-center tracking-widest px-2 border-b border-indigo-100 pb-1">
                {playerName} connected
            </p>
          </div>
        ),
        time: started,
      });
      const ended = conversation.doc.ended;
      const endedGameTime = conversation.doc.endedGameTime;
      membershipNodes.push({
        node: (
          <div key={`left-${playerId}`} className="leading-tight mb-4 mt-2">
            <p className="text-rose-400 text-[10px] uppercase font-bold text-center tracking-widest px-2 border-b border-rose-50 pb-1">
              {playerName} disconnected {endedGameTime ? formatGameTime(endedGameTime) : new Date(ended).toLocaleTimeString()}
            </p>
          </div>
        ),
        time: Math.max(lastMessageTs + 1, ended),
      });
    }
  }
  const nodes = [...messageNodes, ...membershipNodes];
  nodes.sort((a, b) => a.time - b.time);

  // Using createPortal to ensure the prompt covers the entire screen, above all else
  const PromptModal = selectedPrompt ? (
    createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-8 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setSelectedPrompt(null)}
      >
         <div 
           className="bg-white rounded-[2.5rem] w-[90vw] h-[85vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200 border-[6px] border-white ring-[8px] ring-sky-200/50 overflow-hidden"
           onClick={(e) => e.stopPropagation()}
         >
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-6 bg-gradient-to-r from-sky-50 to-white border-b border-sky-100">
               <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm rotate-3 group-hover:rotate-6 transition-transform">
                        🪄
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Prompt Inspector</h3>
                        <p className="text-xs text-sky-600 uppercase tracking-widest font-bold">Raw LLM Interaction Context</p>
                    </div>
               </div>
               <button 
                 onClick={() => setSelectedPrompt(null)}
                 className="w-12 h-12 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-500 border border-slate-200 hover:border-rose-200 flex items-center justify-center text-slate-500 transition-all text-xl font-bold"
               >
                 ✕
               </button>
            </div>
            
            {/* Content */}
            <div className="flex-grow overflow-y-auto p-0 bg-slate-50 relative">
                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-black/5 to-transparent z-10 pointer-events-none"></div>

                <div className="p-8">
                    <div className="prose prose-base max-w-none text-slate-700 font-mono bg-white p-8 rounded-2xl border border-slate-200 shadow-sm whitespace-pre-wrap leading-relaxed selection:bg-sky-200 selection:text-sky-900">
                        {selectedPrompt}
                    </div>
                </div>
            </div>
            
            {/* Footer / Status Bar */}
            <div className="px-8 py-3 bg-white border-t border-slate-200 text-xs font-mono text-slate-400 flex justify-between items-center">
                 <span>DEBUG_MODE::ACTIVE</span>
                 <span>LENGTH: {selectedPrompt.length} CHARS</span>
            </div>
         </div>
      </div>,
      document.body
    )
  ) : null;

  return (
    <div className="chats text-base sm:text-sm bg-transparent border-0 shadow-none">
      <div className="text-slate-700 p-2 relative">
        {PromptModal}
        {nodes.length > 0 && nodes.map((n) => n.node)}
        {currentlyTyping && currentlyTyping.playerId !== humanPlayerId && (
          <div key="typing" className="leading-tight mb-4">
            <div className="flex gap-4 items-baseline mb-1 px-1">
              <span className="uppercase font-bold text-[10px] text-slate-400 flex-grow tracking-wide">{currentlyTypingName}</span>
            </div>
            <div className={clsx('bubble bg-slate-50')}>
              <div className="flex space-x-1 items-center h-5">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
        {humanPlayer && inConversationWithMe && conversation.kind === 'active' && (
          <MessageInput
            worldId={worldId}
            engineId={engineId}
            conversation={conversation.doc}
            humanPlayer={humanPlayer}
          />
        )}
      </div>
    </div>
  );
}
