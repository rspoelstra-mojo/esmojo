import {access} from './auth.js';
import {createShowMemory} from './lib/show-memory.js';
// Wordt uitsluitend binnen de ingelogde browserpagina gebruikt en bij afmelden gewist.
export const showMemory=createShowMemory({request:access});

export function prefetchShow(key){if(!navigator.connection?.saveData&&!['slow-2g','2g'].includes(navigator.connection?.effectiveType))void showMemory.prefetch(key).catch(()=>{});}
