# Online rapportagelink in showrapportagemail

Eigenaar Codex, branch task/report-email-link-20261106. Pas bestaande show-report
mail aan: dynamisch onderwerp/titel, online rapportageknop, ondertekening door
gekoppelde event safety manager en vertrouwelijkheidsfooter. Behoud bestaande
PDF, ontvangers, afzender/reply-to, triggers en idempotentie. Onderzoek veilige
managerbron en bestaande login/deeplink. Scope emailrenderer/template, OnTrack-
levering en gerichte tests/documentatie. Geen echte testmail of inhaalverzending.

Uitgevoerd: gedeelde renderer ondersteunt veilige variabele footer; show-report
gebruikt online knop en dynamische titel/onderwerp. Bestaande exacte ESM-relatie
wordt serverzijdig opgezocht; gebruiker bevestigt merkondertekening bij ontbrekende
manager. Naam/templateversie worden privé bevroren vóór eerste verzendpoging.
Oude onzekere mailpogingen met ander template gaan naar review; geen inhaalmail.

Controle: emailrenderer/testcatalogus, accounts-API, signed OnTrack-keten en gehele
rapportpipeline, managerbron/rechten, frozen retries, authentieke authflow bij
cookieherstel en wachtwoord/TOTP, router, Apps Script/Drive/deploychecks, webcatalogus,
productiebuild en mobiele emailpreview op 320/390/640/1024px. Alleen synthetische
fixtures en gemockte verzending; geen echte mail of productierapport verwerkt.
Publicatie via PR #97, V1.51.
