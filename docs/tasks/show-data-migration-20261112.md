# Eénknopsmigratie Shows naar Dataverse
Eigenaar Codex; branch task/show-data-migration-20261112.
Gebruiker autoriseert de eerder besproken beheerknop: bestaande Shows-gegevens
uit Drive en actieve Supabase-opslag kopiëren naar het nieuwe Dataverse-schema,
met relaties, bestanden, terugleescontrole en veilig hervatten. Bronnen behouden,
geen omschakeling van bestaande lees-/schrijfroutes. Vier nog pending indexen
moeten vóór writes als Actief bevestigd zijn. Geen automatisch starten bij laden.
Eerst broncontract/mapping controleren; onbekende inhoud niet stil overslaan.

Gebouwd: beveiligde serveractie show-migration, read-only schema-preflight met
52 indexen vóór alle andere checks, bestaande Drive/HMAC-exporter, actieve
Supabase-bronkeuze, genormaliseerde mapping, create-only native writer en
blokgewijze Dataverse File-upload/-download. Actor-/schema-gebonden AES-GCM-cursor
houdt native tokens buiten browseropslag. UI heeft één knop en hervatten.

User geeft tijdens het werk 24 uur zonder handmatige Shows-wijzigingen aan.
Bronversiechecks blijven aan. Bestaande readers/writers en originelen behouden;
geen live overdracht vanuit deze runtime. Handleiding/mapping staat in
 docs/dataverse/shows-migratieknop.md.

Controles: 129 gerichte servertests, 7 signed-gatewaytests, 9 syntax-/publicatietests; server-/native simulaties inclusief conflicten, verloren schrijf- en
bestandscommitantwoorden, bronwijziging, indexblokkade, actorbinding, cryptografische
Showbeheer-binding; volledige bestaande Shows-/actieve opslag-/Dataverse-/API-tests,
Apps Script ES2020/signed gateway/publicatietests, browser met blokkade/hervatten,
productiebuild, beveiligingsheaders en diffcontrole. Geen productiecredentials in
deze runtime; daadwerkelijke import wordt door de gebruiker gestart.
