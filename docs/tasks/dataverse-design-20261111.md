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

Scope bijgewerkt na aanvullende gebruikersberichten: centrale SharePoint-PDF's
en vier exacte skillmappen SHOWPROFIELEN, NIEUWE_SHOW, SHOWPROFIEL_RESULTAAT en
NIEUWE_SHOW_RESULTAAT. Alleen ontwerp, geen remote map-/skillaanmaak. De laatste
twee zijn beperkte resultaatontvangst met validatie en review, geen directe
ongecontroleerde Dataverse-writes of automatische ESM-afronding.

Opgeleverd: docs/dataverse/README.md en zeven technische deelplannen plus CSV:
36 eigen tabellen met gegevens/relaties/bronnen, code-inventaris, pagina-/write-
architectuur, PDF/SharePoint-opslag/downloadbudgetten, vier-map-skillcontract,
meetplan en migratie/cutover/rollback/purge. Aantallen/latenties van productie
zijn nadrukkelijk niet gemeten; geen records/credentials in de documenten.

Controle: exact 36 unieke schema-ID's; tabelgrain/gegevens in CSV en Markdown
komen overeen; lokale bron-/documentlinks bestaan; alle vier mapnamen gecontroleerd.
Vite-build, zeven bestaande security-hardening-tests en git diff --check slagen.
Uitsluitend documentbestanden gewijzigd; geen live meetresultaten gefabriceerd.
