import Game from './components/Game.tsx';
import { ToastContainer } from 'react-toastify';
import helpImg from '../assets/help.svg';
import { useState } from 'react';
import ReactModal from 'react-modal';
import Button from './components/buttons/Button.tsx';

import LLMButton from './components/buttons/LLMButton.tsx';
import FreezeButton from './components/FreezeButton.tsx';
import { MAX_HUMAN_PLAYERS } from '../convex/constants.ts';

export default function Home() {
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  return (
    <main className="relative flex h-screen flex-col font-body game-background text-slate-700 overflow-hidden">

      <ReactModal
        isOpen={helpModalOpen}
        onRequestClose={() => setHelpModalOpen(false)}
        style={modalStyles}
        contentLabel="Help modal"
        ariaHideApp={false}
      >
        <div className="font-body space-y-6">
          <h1 className="text-center text-3xl font-bold font-display text-sky-600">AI Hospital Manual</h1>
          <p className="text-slate-500 text-center leading-relaxed">
            Welcome to the AI Hospital Simulation. <br/>Observe <i>autonomous agents</i> or log in to <i>interact</i>.
          </p>
          
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-sky-100 rounded-bl-full opacity-50"></div>
            <h2 className="text-sm font-bold text-sky-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
                <span>👁️</span> Spectator Mode
            </h2>
            <ul className="text-sm space-y-2 text-slate-600 pl-2">
              <li>• <b>Drag</b> to pan the camera view.</li>
              <li>• <b>Scroll</b> to zoom in/out.</li>
              <li>• <b>Click</b> characters to view their diagnostics.</li>
            </ul>
          </div>

          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-100 rounded-bl-full opacity-50"></div>
            <h2 className="text-sm font-bold text-indigo-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
                <span>🎮</span> Interaction Mode
            </h2>
             <ul className="text-sm space-y-2 text-slate-600 pl-2">
              <li>• Click <b>Interact</b> to spawn your avatar.</li>
              <li>• <b>Click</b> the ground to navigate.</li>
              <li>• <b>Click</b> a doctor/patient -&gt; "Start Conversation".</li>
            </ul>
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center">
            * Session limit: {MAX_HUMAN_PLAYERS} active users. 5m idle timeout.
          </p>
        </div>
      </ReactModal>

      {/* Main Container */}
      <div className="flex-grow flex flex-col p-4 gap-4 max-h-screen">
        
        {/* Compact Glass Header - Misty Style */}
        <header className="flex-none flex flex-wrap justify-between items-center rounded-xl glass-panel !bg-white/50 px-6 py-3 z-20">
             <div className="flex items-center gap-6">
                <div className="flex flex-col justify-center">
                    <h1 className="text-2xl font-bold font-display tracking-wide text-slate-700 flex items-center gap-2 opacity-90">
                        <span>AI HOSPITAL</span>
                    </h1>
                </div>

                {/* Divider - Soft Grey */}
                <div className="hidden md:block w-px h-8 bg-slate-300/40"></div>

                {/* Integrated Controls - Variable width buttons to match spec */}
                <div className="flex items-center gap-3">
                    <FreezeButton />

                    <LLMButton />
                </div>
             </div>
             
             <div className="flex items-center gap-3">
                 <Button imgUrl={helpImg} onClick={() => setHelpModalOpen(true)} className="!bg-slate-200 !text-slate-600 hover:!bg-slate-300 border border-slate-300/50 shadow-sm">
                    Help
                 </Button>
             </div>
        </header>

        {/* Game Area - Full Glass Frame */}
        <div className="flex-grow relative rounded-2xl overflow-hidden border-2 border-white/40 shadow-xl bg-white/5 backdrop-blur-sm z-10">
            <div className="absolute inset-0">
               <Game />
            </div>
        </div>
        
        <ToastContainer position="bottom-right" autoClose={3000} closeOnClick theme="light" toastClassName="!rounded-lg !shadow-lg !bg-white/90 !backdrop-blur" />
      </div>
    </main>
  );
}

const modalStyles = {
  overlay: {
    backgroundColor: 'rgba(248, 250, 252, 0.7)', // Slate-50/70
    backdropFilter: 'blur(8px)',
    zIndex: 60,
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: '500px',
    width: '90%',
    border: '1px solid rgba(255,255,255,0.8)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.95)',
    color: '#1e293b',
    padding: '2.5rem',
  },
};
