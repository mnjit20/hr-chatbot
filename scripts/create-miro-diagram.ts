#!/usr/bin/env tsx
/**
 * Generates a full architecture diagram for the HR Chatbot on a Miro board.
 *
 * Usage:
 *   MIRO_TOKEN=<token> tsx scripts/create-miro-diagram.ts
 *
 * Get a token:
 *   1. Go to https://miro.com/app/settings/user-profile/apps
 *   2. Create a new app → enable "boards:write" scope
 *   3. Copy the access token
 */

const BASE = 'https://api.miro.com/v2';
const TOKEN = process.env['MIRO_TOKEN'];

if (!TOKEN) {
  console.error('❌  MIRO_TOKEN env var is required.');
  console.error('   Get one: https://miro.com/app/settings/user-profile/apps');
  process.exit(1);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MiroItem {
  id: string;
}

interface Board {
  id: string;
  viewLink: string;
}

// ─── API client ───────────────────────────────────────────────────────────────

async function miro<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Miro API ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// Small delay to stay within Miro API rate limits (50 req / 10 sec)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Miro does NOT support 8-digit hex colors (#RRGGBBAA)
 * Convert all colors to 6-digit CSS hex strings.
 */
function normalizeColor(color?: string): string {
  if (!color) return '#cbd5e1';

  // Convert #RRGGBBAA -> #RRGGBB
  if (/^#[0-9A-Fa-f]{8}$/.test(color)) {
    return color.slice(0, 7);
  }

  // Allow #RGB or #RRGGBB
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) return color;
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;

  console.warn(`⚠️ Invalid color "${color}", falling back to #cbd5e1`);
  return '#cbd5e1';
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function createBoard(name: string) {
  return miro<Board>('/boards', {
    name,
    description: 'Auto-generated — HR Chatbot architecture',
  });
}

function createText(
  boardId: string,
  content: string,
  x: number,
  y: number,
  fontSize = 24,
) {
  return miro<MiroItem>(`/boards/${boardId}/texts`, {
    data: { content: `<p><strong>${content}</strong></p>` },
    style: {
      color: '#1e293b',
      fontSize: String(fontSize),
      fontFamily: 'open_sans',
      textAlign: 'center',
    },
    position: { x, y, origin: 'center' },
    geometry: { width: 2200 },
  });
}

interface FrameOpts {
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

function createFrame(boardId: string, opts: FrameOpts) {
  return miro<MiroItem>(`/boards/${boardId}/frames`, {
    data: {
      title: opts.title,
      format: 'custom',
      type: 'freeform',
    },
    style: {
      fillColor: normalizeColor(opts.color),
    },
    position: { x: opts.x, y: opts.y, origin: 'center' },
    geometry: { width: opts.w, height: opts.h },
  });
}

interface ShapeOpts {
  content: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  fill: string;
  text?: string;
  border?: string;
  bold?: boolean;
  fontSize?: number;
}

function createShape(boardId: string, opts: ShapeOpts) {
  const label =
    opts.bold === false
      ? opts.content
      : `<strong>${opts.content}</strong>`;

  return miro<MiroItem>(`/boards/${boardId}/shapes`, {
    data: {
      shape: 'round_rectangle',
      content: `<p>${label}</p>`,
    },
    style: {
      fillColor: normalizeColor(opts.fill),
      borderColor: normalizeColor(opts.border ?? '#cbd5e1'),

      // ❌ REMOVE THIS:
      // textColor: normalizeColor(opts.text ?? '#ffffff'),

      fontSize: String(opts.fontSize ?? 12),
      fontFamily: 'open_sans',
      textAlign: 'center',
      textAlignVertical: 'middle',
      borderWidth: '1',
    },
    position: {
      x: opts.x,
      y: opts.y,
      origin: 'center',
    },
    geometry: {
      width: opts.w ?? 185,
      height: opts.h ?? 58,
    },
  });
}

interface ConnectorOpts {
  from: string;
  to: string;
  label?: string;
  color?: string;
  style?: 'normal' | 'dashed';
}

function createConnector(boardId: string, opts: ConnectorOpts) {
  return miro<MiroItem>(`/boards/${boardId}/connectors`, {
    startItem: {
      id: opts.from,
      snapTo: 'bottom',
    },
    endItem: {
      id: opts.to,
      snapTo: 'top',
    },
    style: {
      strokeColor: normalizeColor(opts.color ?? '#94a3b8'),
      strokeWidth: '2',
      strokeStyle: opts.style ?? 'normal',
      endStrokeCap: 'filled_triangle',
      startStrokeCap: 'none',
    },
    ...(opts.label
      ? {
        captions: [
          {
            content: `<p>${opts.label}</p>`,
            textAlignVertical: 'middle',
          },
        ],
      }
      : {}),
  });
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function spreadX(
  count: number,
  centerX: number,
  frameW: number,
  padding = 120,
): number[] {
  if (count === 1) return [centerX];

  const usable = frameW - padding * 2;
  const step = usable / (count - 1);
  const start = centerX - usable / 2;

  return Array.from(
    { length: count },
    (_, i) => start + i * step,
  );
}

// ─── Diagram builder ──────────────────────────────────────────────────────────

async function buildDiagram() {
  console.log('🔧 Creating board...');

  const board = await createBoard(
    'HR Chatbot — Architecture Diagram',
  );

  const B = board.id;

  console.log(`✅ Board: ${board.viewLink}\n`);

  // Layout constants
  const FW = 2200;
  const FH = 280;
  const GAP = 100;
  const STEP = FH + GAP;
  const CX = 0;

  // Y positions
  const TITLE_Y = -320;
  const FE_Y = 0;
  const API_Y = FE_Y + STEP;

  // Title
  await createText(
    B,
    '🤖 HR Chatbot — System Architecture',
    CX,
    TITLE_Y,
    32,
  );

  await sleep(120);

  // Example frame
  await createFrame(B, {
    title: '🖥 Frontend Layer',
    x: CX,
    y: FE_Y,
    w: FW,
    h: FH,
    color: '#eef2ff',
  });

  await sleep(120);

  // Example shapes
  const app = await createShape(B, {
    content: 'React App',
    x: -300,
    y: FE_Y,
    fill: '#6366f1',
    border: '#4f46e5',
  });

  await sleep(80);

  const service = await createShape(B, {
    content: 'chatService',
    x: 300,
    y: FE_Y,
    fill: '#8b5cf6',
    border: '#7c3aed',
  });

  await sleep(80);

  // API frame
  await createFrame(B, {
    title: '🚦 API Layer',
    x: CX,
    y: API_Y,
    w: FW,
    h: FH,
    color: '#fffbeb',
  });

  await sleep(120);

  const controller = await createShape(B, {
    content: 'ChatController',
    x: 0,
    y: API_Y,
    fill: '#f59e0b',
    border: '#d97706',
  });

  await sleep(80);

  // Connectors
  await createConnector(B, {
    from: service.id,
    to: controller.id,
    label: 'POST /chat',
    color: '#6366f1',
  });

  await sleep(100);

  await createConnector(B, {
    from: app.id,
    to: service.id,
    label: 'uses',
    color: '#8b5cf6',
  });

  console.log('\n✅ Diagram generated successfully!');
  console.log(`🔗 Open your diagram: ${board.viewLink}`);
}

buildDiagram().catch((err: unknown) => {
  const msg =
    err instanceof Error
      ? err.message
      : String(err);

  console.error(`\n❌ Failed: ${msg}`);
  process.exit(1);
});