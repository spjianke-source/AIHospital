import { useEffect, useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import closeImg from '../../assets/close.svg';
import { SelectElement } from './Player';

import { toastOnError } from '../toasts';
import { useSendInput } from '../hooks/sendInput';
import { Player } from '../../convex/aiTown/player';
import { GameId } from '../../convex/aiTown/ids';
import { ServerGame } from '../hooks/serverGame';


export default function PlayerDetails({
  worldId,
  engineId,
  game,
  playerId,
  setSelectedElement,
  scrollViewRef,
}: {
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
  game: ServerGame;
  playerId?: GameId<'players'>;
  setSelectedElement: SelectElement;
  scrollViewRef: React.RefObject<HTMLDivElement>;
}) {


  const humanTokenIdentifier = useQuery(api.world.userStatus, { worldId });

  const players = [...game.world.players.values()];
  const humanPlayer = players.find((p) => p.human === humanTokenIdentifier);
  const humanConversation = humanPlayer ? game.world.playerConversation(humanPlayer) : undefined;
  // Always select the other player if we're in a conversation with them.
  if (humanPlayer && humanConversation) {
    const otherPlayerIds = [...humanConversation.participants.keys()].filter(
      (p) => p !== humanPlayer.id,
    );
    playerId = otherPlayerIds[0];
  }

  const player = playerId && game.world.players.get(playerId);
  const playerConversation = player && game.world.playerConversation(player);

  const previousConversation = useQuery(
    api.world.previousConversation,
    playerId ? { worldId, playerId } : 'skip',
  );

  const playerDescription = playerId && game.playerDescriptions.get(playerId);

  const startConversation = useSendInput(engineId, 'startConversation');
  const acceptInvite = useSendInput(engineId, 'acceptInvite');
  const rejectInvite = useSendInput(engineId, 'rejectInvite');
  const leaveConversation = useSendInput(engineId, 'leaveConversation');

  if (!playerId) {
    return (
      <div className="h-full text-lg text-slate-400 flex flex-col justify-center items-center p-8 text-center bg-white/30 rounded-xl m-4 border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-3xl opacity-50 grayscale">
            🧑‍⚕️
        </div>
        <p className="font-bold text-slate-500">No Patient Selected</p>
        <span className="text-xs">Select a character on the map to view diagnostics.</span>
      </div>
    );
  }
  if (!player) {
    return null;
  }
  const isMe = humanPlayer && player.id === humanPlayer.id;
  const canInvite = !isMe && !playerConversation && humanPlayer && !humanConversation;
  const sameConversation =
    !isMe &&
    humanPlayer &&
    humanConversation &&
    playerConversation &&
    humanConversation.id === playerConversation.id;

  const humanStatus =
    humanPlayer && humanConversation && humanConversation.participants.get(humanPlayer.id)?.status;
  const playerStatus = playerConversation && playerConversation.participants.get(playerId)?.status;

  const haveInvite = sameConversation && humanStatus?.kind === 'invited';
  const waitingForAccept =
    sameConversation && playerConversation.participants.get(playerId)?.status.kind === 'invited';
  const waitingForNearby =
    sameConversation && playerStatus?.kind === 'walkingOver' && humanStatus?.kind === 'walkingOver';

  const inConversationWithMe =
    sameConversation &&
    playerStatus?.kind === 'participating' &&
    humanStatus?.kind === 'participating';

  const onStartConversation = async () => {
    if (!humanPlayer || !playerId) {
      return;
    }
    console.log(`Starting conversation`);
    await toastOnError(startConversation({ playerId: humanPlayer.id, invitee: playerId }));
  };
  const onAcceptInvite = async () => {
    if (!humanPlayer || !humanConversation || !playerId) {
      return;
    }
    await toastOnError(
      acceptInvite({
        playerId: humanPlayer.id,
        conversationId: humanConversation.id,
      }),
    );
  };
  const onRejectInvite = async () => {
    if (!humanPlayer || !humanConversation) {
      return;
    }
    await toastOnError(
      rejectInvite({
        playerId: humanPlayer.id,
        conversationId: humanConversation.id,
      }),
    );
  };
  const onLeaveConversation = async () => {
    if (!humanPlayer || !inConversationWithMe || !humanConversation) {
      return;
    }
    await toastOnError(
      leaveConversation({
        playerId: humanPlayer.id,
        conversationId: humanConversation.id,
      }),
    );
  };

  const pendingSuffix = (s: string) => '';

  return (
    <div className="flex flex-col h-full bg-white/60">
       {/* Distinct Header Block */}
      {/* Distinct Header Block */}
      <div className="flex-none p-4 bg-gradient-to-r from-sky-400 to-blue-600 text-white border-b border-white/20 z-10 flex gap-4 items-center shadow-md">
         <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-2xl border border-white/20 shadow-inner backdrop-blur-sm">
            👤
         </div>
         <div className="flex-grow min-w-0">
            <h2 className="text-lg font-display font-bold text-white truncate drop-shadow-sm">
               {playerDescription?.name}
            </h2>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/90 uppercase tracking-wider bg-black/10 px-1.5 py-0.5 rounded backdrop-blur-md">
                   ID: {playerId.split(':')[1]}
                </span>
                {isMe && <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-bold border border-white/20">YOU</span>}
            </div>
         </div>
        <button
          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white hover:text-white shadow-sm border border-white/10"
          onClick={() => setSelectedElement(undefined)}
          title="Close Selection"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>

      <div className="flex-grow flex flex-col gap-4 p-4 overflow-y-auto text-slate-700">
        {/* Actions */}
        <div className="flex flex-col gap-2">
        {canInvite && (
            <button
            className="button w-full shadow-sm bg-indigo-600 hover:bg-indigo-500 text-white"
            onClick={onStartConversation}
            >
                Start Consultation
            </button>
        )}
        {waitingForAccept && (
            <button className="button w-full opacity-50 cursor-not-allowed bg-slate-400 hover:bg-slate-400">
                Paging Doctor...
            </button>
        )}
        {waitingForNearby && (
            <button className="button w-full opacity-50 cursor-not-allowed bg-slate-400 hover:bg-slate-400">
                Patient Approaching...
            </button>
        )}
        {inConversationWithMe && (
            <button
            className="button w-full bg-rose-500 hover:bg-rose-400 shadow-sm"
            onClick={onLeaveConversation}
            >
                End Consultation
            </button>
        )}
        {haveInvite && (
            <div className="flex gap-2">
            <button
                className="button flex-1 bg-emerald-500 hover:bg-emerald-400"
                onClick={onAcceptInvite}
            >
                Accept
            </button>
            <button
                className="button flex-1 bg-rose-500 hover:bg-rose-400"
                onClick={onRejectInvite}
            >
                Decline
            </button>
            </div>
        )}
        {/* Control Button - Only if not playing and target is a patient */}
        {/* Control Button - Only if not playing and target is a patient OR if I am playing as this patient */}
        {playerDescription?.role === 'patient' && (!humanPlayer || isMe) && (
             <>
                 <ControlCharacterButton 
                    worldId={worldId} 
                    playerId={playerId} 
                    isControlledByMe={isMe}
                 />
                 
                 {!isMe && (
                     <DeletePatientButton
                        worldId={worldId}
                        playerId={playerId}
                        onDelete={() => setSelectedElement(undefined)}
                        name={playerDescription.name}
                     />
                 )}
             </>
        )}
        </div>

        {/* Activity Status */}
        {!playerConversation && player.activity && player.activity.until > Date.now() && (
            <div className="bg-white p-3 rounded-xl border-l-4 border-emerald-400 shadow-sm flex items-start gap-3">
                <div className="flex-grow">
                    <h4 className="text-[10px] uppercase text-emerald-600 font-bold mb-0.5 tracking-wider">Current Activity</h4>
                    <p className="text-slate-700 text-xs sm:text-sm font-medium leading-tight">{player.activity.description}</p>
                </div>
            </div>
        )}

        {/* Description / Identity */}
        <div className="my-2 flex-shrink-0">
            <div className="p-4 bg-white/70 text-slate-600 rounded-xl border border-white shadow-sm text-xs sm:text-sm leading-relaxed backdrop-blur-sm group hover:border-indigo-100 transition-colors">
            <PlayerDescriptionEditor 
                worldId={worldId} 
                playerId={playerId} 
                description={playerDescription} 
            />
            {!isMe && inConversationWithMe && (
                <div className="mt-3 text-emerald-600 font-bold flex items-center justify-center gap-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100 animate-pulse">
                    <span>📡</span> Live Audio Feed
                </div>
            )}
            </div>
        </div>

      </div>
    </div>
  );
}

function PlayerDescriptionEditor({ 
    worldId, 
    playerId, 
    description 
}: { 
    worldId: Id<'worlds'>, 
    playerId: GameId<'players'>, 
    description: any 
}) {
    const updateDescription = useMutation(api.playerDescription.update);
    const [identity, setIdentity] = useState(description?.identity || description?.description || "");
    const [plan, setPlan] = useState(description?.plan || "");
    const [isSaving, setIsSaving] = useState(false);
    // Track the original values to detect changes, updated only when playerId changes
    const [originalIdentity, setOriginalIdentity] = useState(identity);
    const [originalPlan, setOriginalPlan] = useState(plan);

    // Only reset inputs when switching to a DIFFERENT character (playerId changes)
    useEffect(() => {
        const newIdentity = description?.identity || description?.description || "";
        const newPlan = description?.plan || "";
        setIdentity(newIdentity);
        setPlan(newPlan);
        setOriginalIdentity(newIdentity);
        setOriginalPlan(newPlan);
    }, [playerId]);

    const hasChanges = identity !== originalIdentity || plan !== originalPlan;

    const onSave = async () => {
        setIsSaving(true);
        try {
            await updateDescription({
                worldId,
                playerId,
                identity,
                plan,
            });
            // After successful save, update the baseline so hasChanges becomes false
            setOriginalIdentity(identity);
            setOriginalPlan(plan);
            await toastOnError(Promise.resolve());
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-400 uppercase block ml-1 tracking-wider">Identity Profile</label>
                <textarea
                    className="w-full h-48 sm:h-[400px] p-3 rounded-lg bg-white text-slate-800 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 outline-none resize-y text-xs sm:text-sm leading-relaxed scrollbar-thin shadow-inner transition-all"
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    placeholder="Enter character identity..."
                />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-400 uppercase block ml-1 tracking-wider">Strategic Plan</label>
                <textarea
                    className="w-full h-32 sm:h-[200px] p-3 rounded-lg bg-white text-slate-800 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 outline-none resize-y text-xs sm:text-sm leading-relaxed scrollbar-thin shadow-inner transition-all"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="Enter character plan..."
                />
            </div>
            
            <button
                className={`button text-white text-sm py-2 px-6 self-end rounded-lg font-medium transition-all transform bg-indigo-600 hover:bg-indigo-500 ${
                    hasChanges && !isSaving ? 'translate-y-0 opacity-100 shadow-lg shadow-indigo-500/30' : 'translate-y-1 opacity-50 pointer-events-none grayscale'
                }`}
                onClick={onSave}
                disabled={!hasChanges || isSaving}
            >
                {isSaving ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving
                    </span>
                ) : (
                    'Update Profile'
                )}
            </button>
        </div>
    );
}


function ControlCharacterButton({ 
    worldId, 
    playerId, 
    isControlledByMe = false 
}: { 
    worldId: Id<'worlds'>, 
    playerId: GameId<'players'>,
    isControlledByMe?: boolean
}) {
    const controlCharacter = useMutation(api.world.controlCharacter);
    const releaseControl = useMutation(api.world.releaseControl);
    
    if (isControlledByMe) {
        return (
            <button
                className="button w-full bg-rose-800 hover:bg-rose-700 text-white shadow-lg border border-rose-600 mt-2"
                onClick={async () => {
                    await toastOnError(
                        releaseControl({
                            worldId,
                            playerId: playerId as string,
                        })
                    );
                }}
            >
                🕹️ Release Control
            </button>
        );
    }

    return (
        <button
            className="button w-full bg-slate-800 hover:bg-slate-700 text-white shadow-lg border border-slate-600 mt-2"
            onClick={async () => {
                await toastOnError(
                    controlCharacter({
                        worldId,
                        playerId: playerId as string,
                    })
                );
            }}
        >
            🕹️ Take Control
        </button>
    );
}

export function ChatInterface({
    worldId,
    playerId,
    conversationId,
}: {
    worldId: Id<'worlds'>;
    playerId: GameId<'players'>;
    conversationId: GameId<'conversations'>;
}) {
    const writeMessage = useMutation(api.messages.writeMessage);
    const suggestMessage = useAction(api.aiTown.agentOperations.suggestMessage);
    const [message, setMessage] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleSendMessage = async () => {
        if (!message.trim()) return;
        await writeMessage({
            worldId,
            conversationId,
            messageUuid: crypto.randomUUID(),
            playerId,
            text: message,
        });
        setMessage("");
    };

    const handleSuggest = async () => {
        setIsGenerating(true);
        try {
            const suggestion = await suggestMessage({
                worldId,
                playerId,
                conversationId,
            });
            setMessage(suggestion);
        } catch (e) {
            console.error("Failed to suggest message:", e);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="mt-4 p-3 bg-white/50 rounded-xl border border-indigo-100 flex-none z-20">
            <h4 className="text-xs font-bold text-indigo-600 uppercase mb-2">Chat</h4>
            <div className="flex flex-col gap-2">
                <textarea
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                />
                <div className="flex gap-2">
                    <button
                        className="flex-1 bg-indigo-600 text-white text-xs py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                    >
                        Send
                    </button>
                    <button
                        className="flex-1 bg-violet-100 text-violet-700 text-xs py-2 rounded-lg hover:bg-violet-200 transition-colors border border-violet-200 flex items-center justify-center gap-1"
                        onClick={handleSuggest}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <span className="animate-spin">✨</span> Thinking...
                            </>
                        ) : (
                            <>
                                <span>✨</span> AI Suggest
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function DeletePatientButton({
    worldId,
    playerId,
    onDelete,
    name
}: {
    worldId: Id<'worlds'>;
    playerId: GameId<'players'>;
    onDelete: () => void;
    name?: string;
}) {
    const deletePlayer = useMutation(api.world.deletePlayer);

    return (
        <button
            className="button w-full bg-red-900/80 hover:bg-red-800 text-white shadow-lg border border-red-700 mt-2 flex items-center justify-center gap-2"
            onClick={async () => {
                if (window.confirm(`Are you sure you want to delete patient ${name || 'Unknown'}? This CANNOT be undone.`)) {
                    await toastOnError(deletePlayer({
                        worldId,
                        playerId: playerId as string,
                    }));
                    onDelete();
                }
            }}
            title="Permanently delete this patient"
        >
            <span>🗑️</span> Delete Patient
        </button>
    );
}

