# Eénknopsmigratie Shows naar Dataverse
Eigenaar Codex; branch task/show-data-migration-20261112.
Gebruiker autoriseert de eerder besproken beheerknop: bestaande Shows-gegevens
uit Drive en actieve Supabase-opslag kopiëren naar het nieuwe Dataverse-schema,
met relaties, bestanden, terugleescontrole en veilig hervatten. Bronnen behouden,
geen omschakeling van bestaande lees-/schrijfroutes. Vier nog pending indexen
moeten vóór writes als Actief bevestigd zijn. Geen automatisch starten bij laden.
Eerst broncontract/mapping controleren; onbekende inhoud niet stil overslaan.
