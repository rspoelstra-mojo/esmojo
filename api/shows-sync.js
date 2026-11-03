import {isolateFluidApi} from '../server/fluid-preview.js';
import { makeShowsSyncHandler } from '../server/shows-sync-api.js';
export const config = { maxDuration: 300 };
export default isolateFluidApi(makeShowsSyncHandler());
