import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids';

export default function ReflectionPanel({
  worldId,
  selectedPlayerId,
  patientId,
}: {
  worldId: Id<'worlds'>;
  selectedPlayerId?: GameId<'players'>;
  patientId?: GameId<'players'>;
}) {
  const reflection = useQuery(api.agent.reflection.latestReflection, { worldId, playerId: selectedPlayerId });

  return (
    <div className="flex flex-col h-full bg-white/60 text-slate-800">
      {/* Distinct Header Block */}
      {/* Distinct Header Block */}
      <div className="flex-none p-4 bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-md z-10">
        <div className="flex items-center gap-2 mb-1">
             <span className="text-xl">🧠</span>
             <h2 className="text-lg font-display font-bold tracking-wide">
                ANALYSIS
            </h2>
        </div>
        <div className="text-[10px] font-mono opacity-80 uppercase tracking-widest pl-1">
             Real-time Cognitive Feed
        </div>
      </div>

      {/* Reflection Text Area */}
      <div className="flex-grow p-4 overflow-y-auto scrollbar-thin">
        {reflection ? (
            <div className="flex flex-col gap-3">
                 <div className="flex justify-between items-center border-b border-indigo-100 pb-2 mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Timestamp</span>
                    <span className="text-[10px] font-mono text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded shadow-sm">{new Date(reflection.ts).toLocaleTimeString()}</span>
                 </div>
                {reflection.insights.map((insight: string, idx: number) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm leading-relaxed text-slate-700 relative pl-8 hover:shadow-md transition-shadow group">
                        <span className="absolute left-3 top-4 text-indigo-300 group-hover:text-indigo-500 transition-colors">➤</span>
                        {insight}
                    </div>
                ))}
            </div>
        ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 italic gap-4 opacity-70">
               <div className="w-16 h-16 rounded-full bg-white border-2 border-dashed border-slate-200 flex items-center justify-center text-3xl opacity-50 grayscale">
                    💭
               </div>
               <p className="font-medium text-sm">No cognitive patterns detected.</p>
             </div>
        )}
      </div>

    </div>
  );
}
