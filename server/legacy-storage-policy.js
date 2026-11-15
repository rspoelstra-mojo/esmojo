// Production business storage has completed all native cutovers. Offline
// fixtures retain archived adapters; a deployed request cannot reopen them.
export const legacyStorageRetired=env=>env.VERCEL_ENV==='production';
export function assertLegacyStorage(env){if(legacyStorageRetired(env))throw Error('INTEGRATION_RETIRED');}
