// IMPLEMENTER NOTE: WebSocket endpoint that streams real-time upload progress to connected clients.
// BUILD.md TASK: STEP 7 — WebSocket Upload Progress
// ARCHITECT CONTRACT: ws://host/ws/uploads/:jobId streams upload progress events from BullMQ
// SHELBY SDK METHODS: None directly; relays events from the upload worker queue.
// DB TABLES: None directly; reads from the upload queue event emitter.
// HANDOFF TO TESTER: Verify WebSocket connects, receives progress events, and closes on completion/error.

import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

import { WebSocketServer, type WebSocket } from 'ws';

import {
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  type UploadProgressEvent,
} from '../lib/queue/queue.js';

interface WsClient {
  jobId: string;
  socket: WebSocket;
}

const clients = new Map<string, WsClient[]>();

function addClient(jobId: string, socket: WebSocket): void {
  const list = clients.get(jobId) ?? [];
  list.push({ jobId, socket });
  clients.set(jobId, list);
}

function removeClient(jobId: string, socket: WebSocket): void {
  const list = clients.get(jobId);
  if (!list) return;
  const idx = list.findIndex((c) => c.socket === socket);
  if (idx !== -1) list.splice(idx, 1);
  if (list.length === 0) clients.delete(jobId);
}

function broadcastToJob(jobId: string, data: Record<string, unknown>): void {
  const list = clients.get(jobId);
  if (!list) return;
  const payload = JSON.stringify(data);
  for (const client of list) {
    if (client.socket.readyState === 1) {
      client.socket.send(payload);
    }
  }
}

let unsubscribeProgress: (() => void) | null = null;
let unsubscribeComplete: (() => void) | null = null;
let unsubscribeError: (() => void) | null = null;

function ensureSubscribed(): void {
  if (unsubscribeProgress !== null) return;

  unsubscribeProgress = onUploadProgress((event) => {
    broadcastToJob(event.jobId, {
      type: 'progress',
      jobId: event.jobId,
      data: event.progress,
    });
  });

  unsubscribeComplete = onUploadComplete((event) => {
    broadcastToJob(event.jobId, {
      type: 'complete',
      jobId: event.jobId,
      dataset: { id: event.dataset.id, name: event.dataset.name },
    });
    // Close all sockets for this job after a short delay
    setTimeout(() => {
      const list = clients.get(event.jobId);
      if (!list) return;
      for (const client of [...list]) {
        client.socket.close(1000, 'Upload complete');
      }
    }, 100);
  });

  unsubscribeError = onUploadError((event) => {
    broadcastToJob(event.jobId, {
      type: 'error',
      jobId: event.jobId,
      error: event.error,
    });
    setTimeout(() => {
      const list = clients.get(event.jobId);
      if (!list) return;
      for (const client of [...list]) {
        client.socket.close(1011, 'Upload failed');
      }
    }, 100);
  });
}

export function createUploadProgressWebSocketServer(
  server: ReturnType<typeof import('node:http').createServer>,
): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const match = url.pathname.match(/^\/ws\/uploads\/([^/]+)$/);

    if (!match) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.emit('connection', ws, request);
    });
  });

  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const match = url.pathname.match(/^\/ws\/uploads\/([^/]+)$/);
    const jobId = match?.[1];

    if (!jobId) {
      socket.close(1008, 'Missing job ID');
      return;
    }

    ensureSubscribed();
    addClient(jobId, socket);

    socket.on('close', () => {
      removeClient(jobId, socket);
    });

    socket.on('error', () => {
      removeClient(jobId, socket);
    });
  });

  return wss;
}
