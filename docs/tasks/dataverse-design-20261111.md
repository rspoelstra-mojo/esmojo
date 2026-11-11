# Dataverse ontwerp en meetplan

Eigenaar: Codex. Branch task/dataverse-design-20261111.
Opdracht: inventarisatie op basis van huidige broncode, relationeel datamodel,
paginaweergaven, wachttijd barrier→vloer, meetplan en gefaseerd migratie-/exitplan.
Alleen ontwerpdocumenten; geen runtime-, schema-, data-, rechten- of credential-
wijzigingen. Supabase Auth blijft; overige blijvende gegevens naar Dataverse.
Prestatie-eisen: eerste bruikbare pagina ≤1s; voorbereide showtabbladen wisselen
zonder netwerk; artiestinformatie+score direct; rapportdetails pas daarna in
nieuwste-eerstvolgorde met klikprioriteit. Grote rapporten alleen opdelen als
metingen bewijzen dat dit nodig is voor de 1s-eis. Geen fictieve meetresultaten.

Scope docs/dataverse/** en deze taaknotitie. Geen nieuwe productiegegevens in Git.
PR API Forbidden; taakbranch als gedeelde registratie volgens samenwerken.md.
