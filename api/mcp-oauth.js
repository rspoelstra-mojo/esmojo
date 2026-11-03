import {isolateFluidApi} from '../server/fluid-preview.js';
import { makeMcpOAuthHandler } from '../server/mcp-oauth.js';
export const config = { maxDuration: 60 };
export default isolateFluidApi(makeMcpOAuthHandler());
