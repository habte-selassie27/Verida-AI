// IMPLEMENTER NOTE: Configures Vite with React support for the Verida AI web workspace.
// BUILD.md TASK: STEP 0 — Repo Bootstrap
// ARCHITECT CONTRACT: React + Vite app scaffold for apps/web
// SHELBY SDK METHODS: None.
// DB TABLES: None.
// HANDOFF TO TESTER: Verify dev/build commands start and compile a minimal React app shell.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
