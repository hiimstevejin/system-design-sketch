# System Design Sketch

A collaborative, real-time whiteboarding application built for engineers. Visualize complex system architectures in seconds using AI or sketch them manually with real-time sync.

**Live Demo:** [system-design-sketch.vercel.app](https://system-design-sketch.vercel.app/draw/f5ab02a9-ec5c-4b34-8e09-073766e5c978)

---

## Features

- **Real-Time Collaboration:** Powered by Supabase Realtime(via websocket) for instant cursor tracking and element syncing across all users.
- **AI Text-to-Diagram:** Convert natural language prompts (e.g., "Design a URL shortener") into visual architectures using **GPT-4o**.
- **Infinite High-DPI Canvas:** Crisp, fuzzy-free rendering on Retina displays with support for panning and zooming.
- **Smart Formatting:** AI-generated elements automatically scale to fit text content and drop into your current viewport.
- **Keyboard First:** Professional workflow with shortcuts:
  - `1`: Select
  - `2`: Rectangle
  - `3`: Arrow
  - `4`: Text
  - `5`: Image Upload
- **Persistence:** Automatic saving to PostgreSQL via Supabase.

---

## Technical Deep Dive

### 1. Coordinate Systems & Transformations

I handled infinite canvas which required managing two different coordinate systems

1. Screen Space: Coordinates relative to the browser window (pixels)
2. World Space: The "infinite" coordinates where elements actually live

Worldx = (ScreenX - CameraX) / Zoom

Worldy = (ScreenY - CameraY) / Zoom

These are the formula used and the logic lives in utils.ts

### 2 High-DPI Canvas Rendering

To solve the "fuzzy" canvas the renderer dynamically detects devicePixelRatio and scales drawing while maintaining CSS logical size:

1. Calculates dpr = window.devicePixelRatio
2. Sets canvas.width = window.innerWidth \* dpr
3. Calls context.scale(dpr,dpr) to ensure drawing commands are automatically sharp

### 3. AI Data Hydration

The Text-to-Diagram feature uses a multistep process

1. LLM Inference: GPT-4o generates a normalized JSON structure at (0,0)
2. Viewport Alignment: frontend shifts these coordinates to the user's current screen center
3. Smart Resizing: A post processing loop calculates text string length and adjusts rectangle widths dynamically to prevent text overflow

---

## Tech Stack

- **Framework:** [Next.js 14+](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database & Realtime:** [Supabase](https://supabase.com/)
- **AI:** [OpenAI API](https://openai.com/) (GPT-4o / JSON Mode)

---

## Getting Started

### 1. Clone & Install

```bash
git clone [https://github.com/yourusername/system-design-sketch.git](https://github.com/yourusername/system-design-sketch.git)
cd system-design-sketch
npm install
```

### 2. Environment Variables

create a .env.local file in the root directory of the project and add the following environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

### 3. Database Schema

Run this in Supabase SQL Editor to set up elements and canvas table

```sql
create table canvases (
  id text primary key,
  name text not null,
  created_at timestamp with time zone default now()
);

)
create table elements (
  id text primary key,
  canvas_id uuid references your_canvases_table(id),
  properties jsonb not null,
  created_at timestamp with time zone default now()
);

-- Enable Realtime for this table
alter publication supabase_realtime add table elements;
```

also set up S3 storage in Supabase that accepts images for image upload

### 4. Run Development

```bash
npm run dev
```

---

## Project Structure

```
app/draw/[canvasId]/
├── _components/        # UI: Toolbar, Canvas, AiGenerator, PropertiesPanel
├── _hooks/             # Logic: usePointerEvents, useCanvasRenderer, useRealtime
├── types.ts            # Type definitions (RawAiElement, Tool, etc.)
├── utils.ts            # Geometry, hit-testing, and coordinate math
└── drawing-canvas.tsx   # Feature orchestrator
app/api/ai/generate/    # AI Backend: GPT-4o JSON generation
```

---

## Roadmap

- [x] AI Diagram Generation
- [x] Real-time Cursor Sync
- [x] Image Support
- [ ] Export to PNG/SVG
- [ ] undo/Redo History
