import { createConciergeServer } from './server.mjs';

// Export the existing HTTP server without starting a standalone listener.
const server = createConciergeServer();
export default server;
