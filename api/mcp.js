import {isolateFluidApi} from '../server/fluid-preview.js';
import { makeMcpHandler } from '../server/mcp-api.js';
export const config = { maxDuration: 60 };
export default isolateFluidApi(makeMcpHandler());
