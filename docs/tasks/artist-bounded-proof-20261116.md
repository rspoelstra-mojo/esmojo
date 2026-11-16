# Begrensde parallelle artiestenbroncontrole

Eigenaar: deze Codex-uitvoering. Branch: task/artist-bounded-proof-20261116.

PR208/V1.148 bewaart alle 199 voorbereide profielen. Productie: koude autorisatie 498 ms, koude opening 552 ms (totaal1049); warm p50 586/max780 ms, dus budget750 nog niet gehaald. Verklein dezelfde volledige bronqueries naar batches van twee met maximaal zestien gelijktijdige batches. Alle rijen, metadata, paging, relaties, versies, actuele rechten en encryptie blijven gecontroleerd. Geen nieuw schema/bron, rechten-TTL of Auth-wijziging; geen herbouw van bestaande projecties nodig. Scope: artist-opening/tests, worker-marker13/fixture, V1.149 en documentatie. Test/publiceer en herhaal de vaste native productieproef; geen voorbereidend resultaat als éénsecondebewijs presenteren.
