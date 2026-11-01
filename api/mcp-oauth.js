import { makeMcpOAuthHandler } from '../server/mcp-oauth.js';
export const config = { maxDuration: 60 };
export default makeMcpOAuthHandler();
