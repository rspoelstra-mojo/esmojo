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
