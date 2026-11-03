import {isolateFluidApi} from '../server/fluid-preview.js';
import { makeResearchHandler } from '../server/research-api.js';
export const config = { maxDuration: 60 };
export default isolateFluidApi(makeResearchHandler());
