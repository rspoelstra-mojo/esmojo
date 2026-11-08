# Actieve historische import en overdracht

Eigenaar: huidige Codex-sessie. Branch: task/historical-import-handoff-20261108.
De gebruiker heeft Pro geactiveerd. V1.92 is live; de oude rapportagelink is in #141
hersteld en historische validatieverzoeken zijn in #142 begrensd.
De goedgekeurde collectie-import loopt nog via run 42484034639. De eerste tien
zijn bevestigd via 42483195084; aparte validatie hervat via 42486399523.
Start geen tweede collectie-import en wijzig de private batch niet tijdens deze run.
Deze PR blijft draft totdat de volledige import, native validatie en terugleescontrole
bevestigd zijn. Alleen daarna worden hervatdocument en afrondstatus definitief
bijgewerkt. Geen CSV-inhoud, ticketcijfers, private bestandsIDs of bronhashes in Git.
