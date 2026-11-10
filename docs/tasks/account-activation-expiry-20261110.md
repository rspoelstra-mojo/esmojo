# Activeringslink onterecht verlopen
Eigenaar huidige Codex-sessie; branch task/account-activation-expiry-20261110.
Onderzoek generatie/verifyOtp en accountactieraces. Bestaande flow verbruikt token
bij paginaladen; iedere verificatiefout heet verlopen. Accountlijst herbouwt bij
achtergrondactiviteit en kan een lopende knop vervangen door een actieve knop.
Herstel: expliciete activeringsklik, Supabase token-hashverificatie type=email
(ondersteunt confirmation/recovery), één verificatie met sessiehergebruik zolang
het scherm actief is; onderscheiden van tijdelijke dienstfouten. Eén uitgifte per
account ondanks herbouw, beide uitgifteknoppen vergrendeld tijdens verwerking.
Geen TTL-verruiming, mailverzending, profielwijziging, MFA-omzeiling of geheimopslag.
Bestaande fragmentlinks blijven ondersteund. Tests gebruiken uitsluitend mocks.
Versie blijft V1.99.

Browserreproducties: oorspronkelijke accountcode maakt een lopende kopieerknop
opnieuw actief na achtergrondherbouw; oorspronkelijke authstart herstart niet
bij een nieuw activeringsfragment in hetzelfde document. Beide regressies zijn
nu afgevangen. Browsercontrole slaagt voor expliciete klik, invite/recovery via
email-tokenhash, één verificatie, verplicht MFA-scherm, zelfde tabblad en één
linkuitgifte tijdens herbouw. Zeven gerichte unit-/clipboardcontroles, 42 account-
API-tests, volledige bestaande CI-Node-set, build en diff-check slagen. Uitsluitend
synthetische testgegevens; geen echte gebruikerslink verbruikt of mail verstuurd.
