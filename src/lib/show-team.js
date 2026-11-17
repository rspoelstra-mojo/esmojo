// Functies in vaste volgorde. De namen zijn voorlopig willekeurige placeholders (geen echte personen of koppelingen);
// de werkelijke teamkoppeling per show volgt in een eigen opdracht.
export const showTeamRoles=Object.freeze(['Productiemanager','Event Safety manager','Projectleider TSC','CMT leider']);
export const showTeamPlaceholders=Object.freeze({'Productiemanager':'Sanne Verbruggen','Event Safety manager':'Daan Koopmans','Projectleider TSC':'Noor Bakhuis','CMT leider':'Tim Veldhuizen'});
export const placeholderTeam=()=>showTeamRoles.map(role=>({role,name:showTeamPlaceholders[role]}));
