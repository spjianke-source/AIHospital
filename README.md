# 🏥 AI Hospital Simulation

> A multi-agent AI simulation of a real hospital environment — built on top of [ai-town](https://github.com/a16z-infra/ai-town), redesigned as a fully role-based medical workflow with support for **local LLMs via Ollama**, DeepSeek, and Qwen.

<!-- Add a demo GIF here once recorded -->
<!-- ![Demo](./assets/demo.gif) -->

---

## ✨ What's Different From ai-town?

[ai-town](https://github.com/a16z-infra/ai-town) provides a general-purpose multi-agent simulation framework. This project repurposes that foundation into a **structured hospital environment** with the following additions:

| Feature | ai-town | AI Hospital |
|---|---|---|
| Scene | Generic small town | Full hospital with departments |
| Agent roles | Generic characters | Doctor / Nurse / Patient with distinct duties |
| Workflow | Free-roaming chat | Structured triage → consultation → examination → discharge |
| LLM backend | OpenAI only | Ollama (local) + DeepSeek + Qwen, switchable in UI |
| Character prompts | Static | Editable live from the UI |
| Reflection | Basic memory | Doctor reflection panel after each consultation |
| Player mode | Observer only | Take control of any patient character |
| Map | Generic town | Custom-designed hospital map |
| Sprites | Generic folk | Custom medical staff sprites |

---

## 🎯 Features

- **🏥 Complete Hospital Workflow** — Triage desk → Outpatient / Emergency doctor → Diagnostic nurse → Inpatient nurse → Discharge
- **🤖 Specialized AI Roles** — Each character (doctor, nurse, patient) has a unique identity and behavioral plan governing how they interact
- **🔄 Switchable LLM Backend** — Switch between Ollama (local), DeepSeek, or Qwen from the UI without restarting
- **🧠 Doctor Reflection Panel** — After each consultation, the doctor generates a structured cognitive reflection visible in the sidebar
- **✏️ Live Prompt Editing** — Edit any character's Identity and Strategic Plan directly from the browser; changes take effect immediately
- **🕹️ Patient Control Mode** — Click "Take Control" to play as a patient and have real conversations with AI doctors
- **💬 AI Message Suggestion** — When chatting, get an AI-suggested next message with one click
- **📡 Real-time Updates** — Powered by Convex; all state (conversations, reflections, memory) syncs in real time across clients
- **🗺️ Custom Hospital Map** — Designed in Tiled, featuring separate zones: registration, outpatient, emergency, examination, and inpatient wards
- **🏃 Pathfinding** — Agents navigate autonomously around the hospital

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (React)               │
│  PixiJS Game Canvas │ Sidebar Panels │ Chat UI  │
└───────────────────┬─────────────────────────────┘
                    │ Convex Reactive Queries
┌───────────────────▼─────────────────────────────┐
│               Convex Backend                     │
│  Game Engine │ Agent Loop │ Memory │ Reflection  │
└───────────────────┬─────────────────────────────┘
                    │ LLM API Calls
         ┌──────────┼──────────────┐
         ▼          ▼              ▼
      Ollama    DeepSeek         Qwen
    (local)    (cloud)          (cloud)
```

**Key technologies:**
- **[Convex](https://convex.dev)** — Reactive backend, database, and real-time sync (supports self-hosted)
- **[PixiJS](https://pixijs.com)** — 2D WebGL game renderer
- **[Ollama](https://ollama.com)** — Run LLMs locally (recommended: `qwen2.5:7b` + `mxbai-embed-large`)
- **React + TypeScript + Tailwind CSS** — Frontend

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Ollama](https://ollama.com/) installed and running
- The following Ollama models pulled:

```bash
ollama pull qwen2.5:7b          # or any chat model
ollama pull mxbai-embed-large   # required for memory embeddings
```

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-hospital.git
cd ai-hospital
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values:

```env
# Convex backend (Cloud or self-hosted)
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud

# Ollama (required)
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

See [`.env.local.example`](.env.local.example) for all available options.

### 3. Set up Convex

**Option A — Convex Cloud (easiest):**

```bash
npx convex dev
```

Follow the prompts to create a free project at [convex.dev](https://convex.dev).

**Option B — Self-hosted Convex:**

Use the provided `docker-compose.yml`:

```bash
docker compose up -d
npx convex deploy --self-hosted
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎮 How to Use

1. **Watch the simulation** — AI agents move autonomously and initiate conversations based on their roles
2. **Click a character** — View their identity, current activity, and conversation history in the sidebar
3. **Start a consultation** — Click "Start Consultation" to initiate a conversation with a doctor or nurse
4. **Take control** — Click "Take Control" on a patient to play as them and talk to AI staff yourself
5. **Edit prompts** — Modify any character's Identity or Plan text in the sidebar and click "Update Profile"
6. **Switch LLM** — Use the LLM button (top bar) to switch between Ollama, DeepSeek, and Qwen
7. **View reflections** — The right panel shows the selected doctor's latest cognitive reflection after a consultation

---

## 🧑‍⚕️ Hospital Staff & Roles

| Character | Role | Responsibility |
|---|---|---|
| 分诊护士 Pete | Triage Desk Nurse | Registers patients, determines Outpatient vs Emergency |
| 门诊医生 Steve | Outpatient Doctor | Full consultation, diagnosis, treatment recommendations |
| 急诊科医生 Bob | Emergency Doctor | Rapid assessment and urgent care |
| 检查护士 Sara | Diagnostic Nurse | Performs tests and returns results on the spot |
| 住院护士 Emily | Inpatient Nurse | Manages admitted patients, follow-up care |
| 病人 John | Patient | Arrives with chronic bronchitis; navigates the hospital |

---

## 🔧 Customization

### Adding a new character

Edit `data/characters.ts`:

```typescript
{
  name: 'Dr. Li',
  character: 'f9',           // sprite name
  identity: `You are Dr. Li, a cardiologist...`,
  plan: `Your goal is to...`,
  role: 'specialist',
  startingPosition: { x: 20, y: 15 },
}
```

### Changing the LLM model

Update `OLLAMA_MODEL` in `.env.local`, or set `DEEPSEEK_API_KEY` / `QWEN_API_KEY` for cloud providers.

### Modifying the hospital map

The map source file is `data/newaihospital.tmj` (Tiled format). After editing, run:

```bash
node data/convertMap.js data/newaihospital.tmj <tileset-path> <width-px> <height-px>
```

---

## 📂 Project Structure

```
├── convex/               # Convex backend (game engine, agents, memory, reflection)
│   ├── aiTown/           # Core simulation engine
│   ├── agent/            # AI agent logic (conversation, reflection, memory)
│   └── util/llm.ts       # LLM provider abstraction
├── data/
│   ├── characters.ts     # Character definitions (identity, plan, role, position)
│   ├── converted-map.js  # Compiled hospital map
│   └── spritesheets/     # Sprite frame data
├── src/
│   ├── components/       # React UI components (Game, PlayerDetails, ReflectionPanel…)
│   └── hooks/            # Convex query hooks
├── assets/               # Static assets (map tileset, icons, sprites)
└── .env.local.example    # Environment variable template
```

---

## 🙏 Credits & License

This project is built on top of **[ai-town](https://github.com/a16z-infra/ai-town)** by [a16z-infra](https://github.com/a16z-infra), which provides the core multi-agent simulation infrastructure, Convex backend integration, PixiJS rendering, and pathfinding engine.

Significant modifications and additions made in this fork:
- Hospital scenario design, map, and medical staff sprites
- Role-based multi-agent workflow (triage → consultation → examination → discharge)
- Local LLM support (Ollama) + DeepSeek / Qwen switchable backend
- Doctor reflection module
- Live prompt editing in the UI
- Patient control mode

Licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.
