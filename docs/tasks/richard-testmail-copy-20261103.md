# Extra testmailadres uitsluitend Richard

Eigenaar Codex, branch task/richard-testmail-copy-20261103. Gebruiker vraagt
iedere bewuste testmail via Beheerder → Email voor uitsluitend het geauthenticeerde
beheerdersaccount redacted@example.invalid ook naar redacted@example.invalid te sturen.
Geen andere accounts of productiemails wijzigen; geen vrije ontvanger toestaan.
Serverzijdige vaste uitzondering met afzonderlijke ontvanger/idempotentiesleutel;
catalogus/UI tonen beide adressen. Bestanden email-tests, email-admin, tests,
projectafspraken en versie V1.27. Alleen gemockte verzending tijdens ontwikkeling.

Uitgevoerd: vaste match op serverprofiel met rol beheerder en exact accountadres
(hoofdletterongevoelig). Beide adressen zichtbaar, twee afzonderlijke berichten
met identieke inhoud/bijlage en stabiele verschillende sleutels. Geen vrije CC.
Zes emailtests en 27 account-API-tests geslaagd; build en diffcontrole geslaagd.
Alle templates, andere rollen/adressen, injectiepoging en hervatten na fout getest.
Geen echte testmail verzonden tijdens ontwikkeling.
