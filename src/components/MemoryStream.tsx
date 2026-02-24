import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function MemoryStream({ playerId }: { playerId: string }) {
  const memories = useQuery(api.queries.latestMemories, { playerId });

  if (!memories) {
    return <div className="text-sm text-gray-500 italic p-2">Loading memories...</div>;
  }

  if (memories.length === 0) {
    return <div className="text-sm text-gray-400 italic p-2">No recent memories found.</div>;
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto h-full p-2 bg-slate-50/50 rounded-lg">
      <h3 className="font-semibold text-xs text-slate-500 uppercase tracking-wider mb-1 sticky top-0 bg-white/80 backdrop-blur-sm p-1 z-10">
        Live Memory Stream
      </h3>
      {memories.map((m: any) => {
        // Determine style based on memory type
        let bgClass = "bg-white border-slate-200";
        let typeColor = "text-slate-500";
        let typeLabel = "MEMORY";

        if (m.data.type === 'conversation') {
            bgClass = "bg-blue-50 border-blue-100";
            typeColor = "text-blue-600";
            typeLabel = "CHAT";
        } else if (m.data.type === 'reflection') {
            bgClass = "bg-purple-50 border-purple-100";
            typeColor = "text-purple-600";
            typeLabel = "THOUGHT";
        } else if (m.data.type === 'relationship') {
            bgClass = "bg-green-50 border-green-100";
            typeColor = "text-green-600";
            typeLabel = "SOCIAL";
        }

        return (
          <div key={m._id} className={`flex flex-col p-2 rounded border shadow-sm ${bgClass} transition-all hover:shadow-md`}>
            <div className="flex justify-between items-center mb-1">
              <span className={`text-[10px] font-bold uppercase ${typeColor}`}>{typeLabel}</span>
              <span className="text-[10px] text-gray-400">
                {new Date(m._creationTime).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {m.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
