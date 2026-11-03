import {access} from './auth.js';
import {createShowMemory} from './lib/show-memory.js';
// Wordt uitsluitend binnen de ingelogde browserpagina gebruikt en bij afmelden gewist.
export const showMemory=createShowMemory({request:access});
