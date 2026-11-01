import { makeShowsSyncHandler } from '../server/shows-sync-api.js';
export const config = { maxDuration: 300 };
export default makeShowsSyncHandler();
