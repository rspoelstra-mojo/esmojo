import {showTeamRoles} from '../../shared/staff-planning.js';
// De vier functies van het projectteam met de naam uit de personeelsplanning (null = nog niet ingevuld).
export const teamRows=roles=>showTeamRoles.map(({label,field})=>{const value=typeof roles?.[field]==='string'?roles[field].trim():'';return{label,name:value||null};});
