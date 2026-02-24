import { useRef, useState } from 'react';
import PixiGame from './PixiGame.tsx';
import clsx from 'clsx';
import { useElementSize } from 'usehooks-ts';
import { Stage } from '@pixi/react';
import { ConvexProvider, useConvex, useQuery } from 'convex/react';
import PlayerDetails, { ChatInterface } from './PlayerDetails.tsx';
import { api } from '../../convex/_generated/api';
import { useWorldHeartbeat } from '../hooks/useWorldHeartbeat.ts';
import { useHistoricalTime } from '../hooks/useHistoricalTime.ts';
import { DebugTimeManager } from './DebugTimeManager.tsx';
import { GameId } from '../../convex/aiTown/ids.ts';
import { useServerGame } from '../hooks/serverGame.ts';

import PatientPromptPanel from './PatientPromptPanel.tsx';
import ReflectionPanel from './ReflectionPanel.tsx';
import { Messages } from './Messages.tsx';

export const SHOW_DEBUG_UI = !!import.meta.env.VITE_SHOW_DEBUG_UI;

export default function Game() {
  const convex = useConvex();
  const [selectedElement, setSelectedElement] = useState<{
    kind: 'player';
    id: GameId<'players'>;
  }>();
  const [activeTab, setActiveTab] = useState<'chart' | 'chat' | 'analysis'>('chart');
  const [gameWrapperRef, { width, height }] = useElementSize();

  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const engineId = worldStatus?.engineId;

  const game = useServerGame(worldId);

  // Send a periodic heartbeat to our world to keep it alive.
  useWorldHeartbeat();

  const worldState = useQuery(api.world.worldState, worldId ? { worldId } : 'skip');
  const { historicalTime, timeManager } = useHistoricalTime(worldState?.engine);

  const scrollViewRef = useRef<HTMLDivElement>(null);

  const humanTokenIdentifier = useQuery(api.world.userStatus, worldId ? { worldId } : 'skip');
  const players = game ? [...game.world.players.values()] : [];
  const humanPlayer = players.find((p) => p.human === humanTokenIdentifier);
  const humanConversation = humanPlayer && game ? game.world.playerConversation(humanPlayer) : undefined;

  if (!worldId || !engineId || !game) {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full text-slate-400 gap-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin"></div>
            <p className="font-bold text-sm tracking-widest uppercase">Connecting to Hospital System...</p>
        </div>
    );
  }

  const patient = [...game.world.players.values()].find((p) => {
    const desc = game.playerDescriptions.get(p.id);
    return desc?.role === 'patient';
  });

  return (
    <>
      {SHOW_DEBUG_UI && <DebugTimeManager timeManager={timeManager} width={200} height={100} />}

      <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden relative p-2 gap-2">
        
        {/* Left Column: Patient Admission (Card Style with Border) */}
        <div className="flex flex-col shrink-0 w-full lg:w-72 bg-white/40 backdrop-blur-xl z-10 overflow-hidden rounded-xl border-2 border-white/50 shadow-lg">
           <PatientPromptPanel />
        </div>

        {/* Center Column: Game Canvas (Card Style with Border) */}
        <div className="relative flex-grow overflow-hidden bg-white/30 rounded-xl border-2 border-white/50 shadow-lg" ref={gameWrapperRef}>
          <div className="absolute inset-0 shadow-inner rounded-xl overflow-hidden">
             {/* 0xf8fafc is slate-50 hex */}
             <Stage width={width} height={height} options={{ backgroundColor: 0xf8fafc, backgroundAlpha: 0.3 }}> 
                <ConvexProvider client={convex}>
                  <PixiGame
                    game={game}
                    worldId={worldId}
                    engineId={engineId}
                    width={width}
                    height={height}
                    historicalTime={historicalTime}
                    setSelectedElement={(element) => {
                        setSelectedElement(element);
                        // Auto-switch to chart tab when selecting a player
                        if (element?.kind === 'player') {
                            setActiveTab('chart');
                        }
                    }}
                  />
                </ConvexProvider>
              </Stage>
          </div>
        </div>

        {/* Right Column: Tabbed Inspector (Misty Paper Style) */}
        <div className="flex flex-col shrink-0 w-full lg:w-96 bg-white/40 backdrop-blur-xl z-10 overflow-hidden rounded-xl border border-white/50 shadow-lg shadow-slate-200/50">
            
            {/* Tab Switcher - Minimalist Clinical Blue */}
            <div className="flex p-1.5 gap-1 border-b border-white/50 bg-white/30">
                <button 
                    onClick={() => setActiveTab('chart')}
                    className={clsx(
                        "flex-1 py-2.5 text-xs font-bold font-display uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2",
                        activeTab === 'chart' 
                            ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-200" 
                            : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                    )}
                >
                    <span>📋</span> <span className="hidden sm:inline">Info</span>
                </button>
                 <button 
                    onClick={() => setActiveTab('chat')}
                     className={clsx(
                        "flex-1 py-2.5 text-xs font-bold font-display uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2",
                        activeTab === 'chat' 
                             ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-200" 
                            : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                    )}
                >
                    <span>💬</span> <span className="hidden sm:inline">Chat</span>
                </button>
                <button 
                    onClick={() => setActiveTab('analysis')}
                     className={clsx(
                        "flex-1 py-2.5 text-xs font-bold font-display uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2",
                        activeTab === 'analysis' 
                             ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-200" 
                            : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                    )}
                >
                    <span>🧠</span> Analysis
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-grow overflow-y-auto relative bg-transparent scrollbar-thin" ref={scrollViewRef}>
                {activeTab === 'chart' && (
                    <div className="h-full">
                         <PlayerDetails
                            worldId={worldId}
                            engineId={engineId}
                            game={game}
                            playerId={selectedElement?.kind === 'player' ? selectedElement.id : undefined}
                            setSelectedElement={setSelectedElement}
                            scrollViewRef={scrollViewRef}
                         />
                    </div>
                )}



                {activeTab === 'chat' && (
                    <div className="h-full flex flex-col">
                        {/* Distinct Header Block for Chat - Clinical Blue Theme */}
                         <div className="flex-none p-5 bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-md z-10 flex gap-4 items-center relative overflow-hidden">
                            {/* Subtle Texture Overlay */}
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                            
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-lg backdrop-blur-sm border border-white/20 shadow-inner z-10">
                                💬
                            </div>
                            <div className="flex-grow min-w-0 z-10">
                                <h2 className="text-xl font-display font-medium tracking-wide truncate">
                                    Transcript
                                </h2>
                                <div className="text-[10px] font-mono opacity-80 uppercase tracking-widest pl-0.5">
                                    Live Communication
                                </div>
                            </div>
                         </div>
                         <div className="flex-grow overflow-y-auto p-4 scrollbar-thin">
                            {(() => {
                                const selectedPlayerId = selectedElement?.kind === 'player' ? selectedElement.id : undefined;
                                const player = selectedPlayerId ? game.world.players.get(selectedPlayerId) : undefined;
                                const activeConversation = player ? game.world.playerConversation(player) : undefined;
                                
                                const conversationDoc = activeConversation ? { kind: 'active' as const, doc: activeConversation } : undefined;
                                
                                if (selectedPlayerId && conversationDoc) {
                                     return (
                                        <Messages
                                            worldId={worldId}
                                            engineId={engineId}
                                            inConversationWithMe={false} 
                                            conversation={conversationDoc}
                                            humanPlayer={undefined}
                                            scrollViewRef={scrollViewRef}
                                        />
                                     );
                                } else if (selectedPlayerId) {
                                     return (
                                        <ArchivedConversationView 
                                            worldId={worldId} 
                                            engineId={engineId} 
                                            playerId={selectedPlayerId} 
                                            scrollViewRef={scrollViewRef}
                                        />
                                     );
                                } else {
                                     return (
                                        <EmptyChatState />
                                     );
                                }
                            })()}
                         </div>

                         {/* Chat Input Area */}
                         {(() => {
                            // Logic to show chat input
                            const players = [...game.world.players.values()];
                            // We need humanTokenIdentifier. We must fetch it at top level.
                            // I will assume humanTokenIdentifier is added to Game component scope
                            if (humanPlayer && humanConversation) {
                                // Show if selected player is part of the conversation OR if selected player IS the human player
                                const selectedPlayerId = selectedElement?.kind === 'player' ? selectedElement.id : undefined;
                                const isParticipating = selectedPlayerId && (
                                    humanConversation.participants.has(selectedPlayerId) || 
                                    selectedPlayerId === humanPlayer.id
                                );

                                if (isParticipating) {
                                    return (
                                        <div className="p-4 border-t border-white/50 bg-white/40 backdrop-blur-md">
                                            <ChatInterface
                                                worldId={worldId}
                                                playerId={humanPlayer.id}
                                                conversationId={humanConversation.id}
                                            />
                                        </div>
                                    );
                                }
                            }
                            return null;
                         })()}
                    </div>
                )}
                
                {activeTab === 'analysis' && (
                     <div className="h-full">
                        <ReflectionPanel 
                            worldId={worldId} 
                            selectedPlayerId={selectedElement?.kind === 'player' ? selectedElement.id : undefined} 
                            patientId={patient?.id} 
                        />
                     </div>
                )}
            </div>
        </div>

      </div>
    </>
  );
}

function ArchivedConversationView({ worldId, engineId, playerId, scrollViewRef }: { worldId: any, engineId: any, playerId: GameId<'players'>, scrollViewRef: any }) {
    const previousConversation = useQuery(api.world.previousConversation, { worldId, playerId });
    
    if (!previousConversation) {
        return <EmptyChatState message="No clinical records found." />;
    }

    return (
        <Messages
            worldId={worldId}
            engineId={engineId}
            inConversationWithMe={false}
            conversation={{ kind: 'archived', doc: previousConversation }}
            humanPlayer={undefined}
            scrollViewRef={scrollViewRef}
        />
    );
}

function EmptyChatState({ message = "Select a character to view their conversation." }: { message?: string }) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 italic p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-3xl opacity-50 grayscale">
                🔇
            </div>
            <p>{message}</p>
        </div>
    );
}
