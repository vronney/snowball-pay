// `ws` ships no types and is only a transitive dependency here, used by
// scripts/neon-ws.ts to give the Neon serverless adapter a WebSocket on
// Node 20. Keep this minimal; drop it if @types/ws is ever added.
declare module 'ws' {
  const WebSocketImpl: typeof globalThis.WebSocket;
  export default WebSocketImpl;
}
