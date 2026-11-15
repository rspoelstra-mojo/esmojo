# Rapportages bruikbaar binnen 1,5 seconde

Eigenaar huidige Codex-uitvoering; task/reports-load-1500ms-20261115.
Gebruiker vraagt beloofde 1,5s Rapportages-laadtijd daadwerkelijk te realiseren.
Meet klik tot bruikbare inhoud, inclusief eerste opening; geen skeleton/warm
backend-only resultaat als eindbewijs. Behoud parser, berekeningen, CSV17, weergave,
filters, historische links, actuele serverautorisatie, Auth/MFA en native autoriteit.
Geen zakelijke testwrites, mails, bronverwijdering of authbypass. Bestaande native
projectiepatroon mag voor afgeleide versleutelde Reports-leesprojectie worden
hergebruikt met verse native-versie-/relatiecontrole; geen tweede bron of rechten-TTL.
Verwacht gerichte Reports-reader/projectie/API/browser/performance-tests en
privacyveilige vaste main/OIDC metingen. Nieuwe schema-/inhoudkeuze niet stil maken.

Implementatie: afgeleide AES-GCM/gzip web-DTO in bestaande Integratiestatus,
volledige native bron/File/parsercontrole bij opbouw en sterke complete ID/ETag-
sets in read-only batch vóór iedere read. Metadata gebonden in versleutelde proof;
geen nieuwe schemaonderdelen, bronautoriteit of rechten-TTL. Rechten/Profile/ACL/
getypeerde modules in één verse batch zonder avatar; alleen huidig serverprofiel
binnen hetzelfde HTTP-verzoek hergebruiken. Autoriteit/activatiebewijs ook vers
batched. Tokencontext blijft bij bestaande tijdig vernieuwende verbinding.

Browser: directe rapportage parallel aan menu, geen dubbele opening bij eerste
revisievulling, dezelfde data/filters, offscreen layout/paint uitgesteld. Gekozen
openbare foto als bestaande600x338 WebP-variant; readiness na foto-decode en twee
paintframes. Uitsluitend technische timingmarkeringen, geen inhoud/IDs/analytics.

Bestaande main/OIDC worker bereidt alle huidige221 projecties voor via encrypted
servercheckpoint en lease/CAS, actuele rechten elke ronde. Cacheonderhoud is geen
nieuwe of verlengde taakmachtiging. Meet oorspronkelijke native pad, representatieve
warme reads en grootste rapport met geheel nieuwe verbinding. Geen bereikte1,5s
claim uit publicatie/voorbereiding alleen. Geldige livebrowser ontbreekt; cloud-
opening faalt met 'Browser Use could not read requirements'. Geen authbypass.

Lokaal:804 brede servertests groen (1 conditionele Redis-test overgeslagen), gerichte
snapshot/nieuwe-verwijderde rijen/gelijktijdigheid/verloren ACK/actuele rechten/token-
vernieuwing tests groen; build/diffcontrole groen. Echte Chrome-router/pagina met500
fictieve incidenten,950ms nagebootste API en2s vertraagd menu:1022–1073ms klik tot
bruikbare inhoud incl.foto op390/1440px,licht/donker; één reportread en filters intact.
Dit is synthetisch bewijs; productievoorbereiding en timings volgen na publicatie.
