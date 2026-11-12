# Alle Drive AI-analyses importeren
Eigenaar Codex; branch task/bulk-data-transition-20261112.
Gebruiker vraagt één knop voor alle bestaande AI-analyses uit Drive naar Dataverse.
Scope: bestaande beheerderspagina en serverimport; geen deletes, geen eigen teksten.
Per vraag verwerken, teruglezen, idempotent herhalen, zichtbare voortgang en conflicten.

Gebouwd: knop start zelfstandig volledige catalogus, inventariseert per show,
verwerkt alleen aanwezige vragen en telt nieuw/bestaand/ontbrekend/conflict.
Conflicten blokkeren overige analyses niet; onzekere fouten pauzeren voor hervatten.
Geen echte bulkimport gestart vanuit ontwikkeling.
Validatie: servertests en Chromium met meerdere shows, actief zoekfilter,
conflicten, onderbreking/hervatten, dubbelklikken en mobiele breedte; build.
