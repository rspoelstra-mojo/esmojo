# Entreeproces niet van toepassing bij Gashouder

Eigenaar: Codex, deze chat. Branch: task/entrance-gashouder-20261103.

Bij concertlocatie Gashouder blijft Entreeproces zichtbaar maar grijs en
niet aanklikbaar, met kleine tekst (Nvt bij Gashouder shows) achter de titel.
Geen afronding nodig en geen fictieve afrondstatus opslaan. De huidige stap heeft
nog geen invoer/afrondworkflow; geen nieuwe opslag of persoonsgegevens nodig.
Andere locaties behouden de bestaande actieve knop en detailpagina.

Bestanden: src/risk-analysis.js, src/risk-analysis.css, bestaande UI-test,
index.html (V1.15). Publicatie volgens de doorlopende toestemming in AGENTS.md.

Aanvullend verzoek tijdens uitvoering: laat het kader rond de vijf vierkante
standaard-barrierafbeeldingen aansluiten op de afbeelding zelf, met afgeronde
afbeeldingshoeken. Het label Schematische weergave volgt de linkerrand van het
nieuwe kader. Eigen uploads/PDF-weergave behouden hun bestaande indeling.
Extra bestanden: src/barrier-layout-page.js en src/production-assessment.css.

Aanvullend verzoek Vloerdruk: label en invoer structureren zodat bezoekers, netto
m² en dichtheid steeds op dezelfde lijn staan, ook bij dynamische vakken. Onder
de vakken een vaste, uitsluitend berekende regel Zitplaatsen: hoogste opgeslagen
ticketreferentie minus ingevoerde vakbezoekers, ondergrens nul. Bij ontbrekende
tickets geen aantal verzinnen. Zitplaatsen heeft geen m² of dichtheid en voegt
geen verplichte invoer toe. Het aantal is reproduceerbaar uit bestaande opgeslagen
rijen en ticketreferentie; geen parallelle opslag/schemawijziging. Totaalcontrole
neemt zitplaatsen mee en blijft waarschuwen bij meer ingevoerde bezoekers dan
tickets. Extra bestand: src/floor-pressure-page.js.

Verificatie: bestaande risico- en productiebeoordelingstests en productiebuild.
Browser: Gashouder/andere locatie, light/dark en smal/breed; alle vijf PNG’s exact
passend en afgerond met uitgelijnd label; vloervelden gelijk in hoogte en baseline,
herberekening Zitplaatsen, heropenen uit bestaande opslag, GC en dynamische vakken,
overschrijding en ontbrekende ticketgegevens. Geen extra invoer in opslagrecords.
