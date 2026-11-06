// Technische envelopvelden zijn voor auth/homecache, niet voor domeinvalidatie.
// Onbekende velden blijven intact zodat strikte validators fouten blijven zien.
export function accessResultPayload(result){
 if(!result||typeof result!=='object'||Array.isArray(result))return result;
 const {homePlanning,storageStale,...payload}=result;
 return payload;
}
