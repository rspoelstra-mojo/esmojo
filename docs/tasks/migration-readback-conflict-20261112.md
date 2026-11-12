# Diagnose en herstel terugleesconflict eerste show
Eigenaar Codex; branch task/migration-readback-conflict-20261112.
Gebruiker meldt conflict na 25 records/6 bestanden bij eerste show. Geen toegang
tot productie-inhoud in runtime. Onderzoek representatieverschillen bij native
teruglezen; accepteer alleen aantoonbaar equivalente waarden, behoud echte
conflictstop/create-only. Voeg veilige tabel-/kolomdiagnose zonder bronwaarden,
identiteiten, IDs, hashes, bestanden of providerbody toe waar exacte oorzaak
zonder productie-inhoud niet kan worden vastgesteld. Geen automatische import.

Bevinding: strikte vergelijking beschouwde lege optionele tekst versus native null
als conflict, evenals bronmilliseconden versus dezelfde native seconde. Beide
gevallen gereproduceerd met native-responsefixture. Vergelijking accepteert alleen
deze representaties; andere inhoud, nul/null, andere seconden/dagen en verschillende
niet-nul milliseconden blijven conflicten. Native lookup-GUIDs zijn hoofdletterongevoelig.
Artiestbron (biografie/foto) krijgt oorspronkelijke metadata/tijdstippen in Historie.
Veilige diagnose vermeldt alleen schematabel/kolom en vaste reden. Geen automatische
overschrijving. De precieze live conflictkolom was niet uit screenshot vast te stellen;
nieuwe diagnose maakt die zichtbaar als de inhoud werkelijk afwijkt.
