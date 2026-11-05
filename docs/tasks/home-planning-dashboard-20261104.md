# Homepage planningdashboard

Eigenaar Codex, branch task/home-planning-dashboard-20261104.
Implementeer aangeleverde overdracht en HTML als echte homepage zonder submenu,
met ongewijzigd hoofdmenu. Alleen Gashouder, echte foto's/datums/statussen en
bestaande planning 31/14/7/1 dagen. Links vijf volgende shows, midden eigen open
weekdeadlines plus maandkalender, rechts eigen volledige gekoppelde verzameling.
Onderzoek: catalogus in Drive Productie, canonieke concert-/reeks-IDs; module/MFA
via accounts-api. Geen bestaand managerrelatiemodel, algemene showafronding of
gezaghebbende voorsprongregel. Gebruiker gevraagd om classificatie van nieuwe
managerrelatie en neutrale presentatie zolang die laatste bedrijfsregels ontbreken.
Werk onafhankelijke componenten verder uit zonder onbevestigde statuslogica.
Scope nieuwe gedeelde dashboard/planningslaag, beveiligde minimale readservice,
Drive-bundeling/toewijzing en importhook, frontend/CSS/tests/docs, V1.38.
Geen e-mails/PDF-generatie, geen publieke of browserpersistente dashboarddata.


Onafhankelijke implementatie staat gereed: shared/home-catalogue.js (met identieke
Drive-versie), shared/home-planning.js, HomeDashboard.gs, beveiligde API-reads,
home-dashboard.js/CSS en fallback naar bestaande showpagina buiten het huidige
submenuvenster. Zie docs/homepage-dashboard.md. Geen managerrelaties geschreven:
classificatie en voorstel voor ontbrekende algemene statusregels blijven open.

Werkelijke brongegevens via Drive gelezen en lokale projectie getest; uitsluitend
buiten Git. Bestaande account eenduidig/actief. Browsercontrole licht/donker op
acht breedtes, officiële foto's, gelijke blokhoogten, datum-/week-/maandgrenzen,
kalendernavigatie, leeg/fout/herproberen en late reacties. Geen fictieve tijden,
Unsplash of productiegegevens in broncode. Build en passende server/Drive/module/
planning/directe-route-tests worden vóór draftoplevering afgerond. Geen publicatie
naar main zolang noodzakelijke bevestigingen ontbreken.


5 november: gebruiker bevestigt Vertrouwelijk in Drive voor account-showrelaties
en de neutrale algemene statusweergave. Toewijzingen staan apart van de openbare
concertindex. Nieuwe centrale ShowAssignments.gs-regel via dezelfde normale
importworkflow; duplicaten voorkomen, andere relaties/rollen/accountrechten
behouden, ontbrekend/ambigu account alleen als afhankelijke fout behandelen.
De eenmalige backfill is vóór publicatie uitgevoerd met deze regel op de echte
gegevens, in het juiste Productie-register geüpload en byte-exact teruggelezen;
geen openbare deling. Alle canonieke Gashouder-showdagen en het bestaande juiste
account geverifieerd, geen andere zaal gekoppeld. Lokale herhaling schrijft niets.

Persoonlijke dashboardprojectie opnieuw getest met het teruggelezen echte
register en bestaande statusdocumenten. Alle eigen planningssnapshots leesbaar;
geen ruwe documenten in Git/CI/logs. Showdagen in lijsten/teller onderscheiden
van gedeelde reeksdeadlines, om dubbel tellen te voorkomen. Aanvullende echte
importintegratietests voor bestaande relaties, nieuwe shows, herhaalbaarheid en
ontbrekend/ambigu account. Publicatiecontrole volgt hieronder.
