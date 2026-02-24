import { useState } from 'react';
import { generateRandomPatient } from '../lib/patientGenerator';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function PatientPromptPanel() {
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  
  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const sendInput = useMutation(api.aiTown.main.sendInput);

  const onRandomGenerate = () => {
    const p = generateRandomPatient();
    setName(p.name);
    setIdentity(p.identity);
  };

  const onConfirm = async () => {
    if (!name || !identity || !worldId) return;
    try {
        await sendInput({
            worldId,
            name: 'respawnPatient',
            args: {
                name,
                identity,
                character: 'f7', // Default patient character
            }
        });
        console.log("Patient respawned!");
    } catch (e) {
        console.error("Failed to respawn patient:", e);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white/60">
      {/* Distinct Header Block */}
      <div className="flex-none p-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md z-10">
        <div className="flex items-center gap-2 mb-1">
             <span className="text-xl">🏥</span>
             <h2 className="text-lg font-display font-bold tracking-wide">
                ADMISSION
            </h2>
        </div>
        <div className="text-[10px] font-mono opacity-80 uppercase tracking-widest pl-1">
             Patient Configuration Link
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-grow flex flex-col gap-4 p-4 overflow-y-auto">
        <div className="space-y-1">
            <label className="block text-xs font-bold text-sky-700 uppercase ml-1 flex items-center gap-1">
                <span className="w-1 h-3 bg-sky-500 rounded-full inline-block"></span> Patient Name
            </label>
            <input 
            className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm"
            placeholder="Enter name..." 
            value={name}
            onChange={(e) => setName(e.target.value)}
            />
        </div>

        <div className="space-y-1 flex-grow flex flex-col min-h-0">
            <label className="block text-xs font-bold text-sky-700 uppercase ml-1 flex items-center gap-1">
                <span className="w-1 h-3 bg-sky-500 rounded-full inline-block"></span> Symptom Profile
            </label>
            <textarea 
            className="w-full flex-grow bg-white border border-slate-200 rounded-lg text-slate-800 p-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all resize-none leading-relaxed scrollbar-thin shadow-inner placeholder:text-slate-300"
            placeholder="Enter detailed medical persona..." 
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            />
        </div>

        <div className="flex flex-col gap-3 pt-2">
            <button 
            className="w-full py-3 rounded-lg border-2 border-dashed border-sky-200 text-sky-600 hover:bg-sky-50 hover:border-sky-300 font-bold text-sm transition-all flex justify-center items-center gap-2 group bg-transparent"
            onClick={onRandomGenerate}
            >
                <span className="group-hover:rotate-180 transition-transform duration-500">🎲</span> Randomize Data
            </button>
            <button 
                className="button w-full justify-center shadow-lg shadow-sky-500/20 py-3"
                onClick={onConfirm}
            >
                Process Admission
            </button>
        </div>
      </div>
    </div>
  );
}
