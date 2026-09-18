// Node 20 has no global WebSocket; the Neon serverless adapter needs one.
// Import this before anything that touches @/lib/prisma.
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
