# Volledige accountopslag; Supabase Auth blijft

Deze taak voltooit de accountmigratie. De bestaande beperkte account-access-v1
blijft de actuele status/modules leveren, tot dezelfde accountschrijftransactie
ze samen met profiel en rol bijwerkt. De nieuwe autoriteit account-native-v1
wordt uitsluitend na de nieuwe beheeropdracht geactiveerd. Publicatie is geen
activering. Oude taakmachtigingen worden niet hergebruikt of verlengd.

## Gegevens en autoriteit

Bestaande vertrouwelijke accountgegevens behouden hun classificatie. Geen nieuw
gegevensdoel of uitbreiding van rechten. De bestaande Medewerker-tabel bevat
naam, e-mail, organisatie, functie, gewone rol en dezelfde Supabase Auth-ID.
De bestaande vaste superbeheerder wordt als beheerder opgeslagen, met zijn
onveranderde bijzondere identiteit in versleutelde native beleidsinstellingen.
Dezelfde instellingen bewaren het bestaande private kopieadres voor testmails.
Dit adres verschijnt alleen in de bestaande servercontext van die superbeheerder.
De API geeft het niet door aan andere accounts.

Foto's gaan naar Document File, met SHA-256, bytes-terugleescontrole en een
Documentkoppeling naar de betreffende Medewerker. De versleutelde accountmetadata
verwijst naar de gekozen versie. Geen openbare bestands-URL, browseropslag of
fotobytes in tekstkolommen. Oude versies en oorspronkelijke Drive-gegevens blijven.
Het actieve Shows-schema en de gedeelde keuzeopties veranderen niet.

Supabase blijft de autoriteit voor loginidentiteit, wachtwoorden, bevestiging,
uitnodigings-/herstellinks, MFA-factoren en sessies. Accountstatus en modulerechten
blijven Dataverse. De bestaande accounteditor en authenticatieflow veranderen niet.

## Schrijven en toegang

Elke bewerking leest actueel beleid, profiel en ACL. Ontbrekende, onleesbare,
afgewezen of onzekere gegevens leiden niet tot een Drive-fallback. Rollen worden
niet gecachet. De superbeheerder-, eigen-account-, laatste-beheerder- en organisatie-
regels blijven gelden. Verwijderen blokkeert eerst het account; historische
Medewerker-relaties blijven bestaan via een afgeschermde tombstone.

Eén conditionele Dataverse-changeset bewaart Medewerker, moduleprojectie, ACL,
fotoverwijzing en beleidsrevisie. De beleids-ETag serialiseert ook wijzigingen aan
verschillende accounts, zodat gelijktijdige rolwijzigingen de laatste-beheerderregel
niet kunnen omzeilen. Bestandsbytes worden vóór die transactie voorbereid; een
verloren antwoord is pas succes nadat ieder veld, lookup, ACL, pointer en generatie
onafhankelijk gelijk is teruggelezen. Shows mag na de accountfreeze geen oude
actorprofielkopie over de canonieke Medewerker schrijven.

## Uitvoering

Beheerder → Datatransitie → **Volledige accountopslag** →
**Voorbereiden, controleren en activeren** start een nieuwe 48-uursmachtiging via
bestaande actuele admin/Shows/MFA-controle. De generieke achtergrondworker beheert
versleuteld checkpoint, globaal slot, taaklease, ETag en generatie. Geen automatische
start bij publicatie of paginaladen. Een verlopen oude grant is geen startmachtiging.

1. Controleer de bestaande native ACL en de nieuwe ondertekende bronprotocolpoort.
2. Zet de native accountschrijfstop en de Apps Script-accountfence onder hetzelfde
   bronslot als de accountwrites. Laat oude verzoeken elf minuten uitlopen.
3. Kopieer de bronprofielen, instellingen en foto's, met actuele native ACL-flags.
   Neem geen oude Drive-status als nieuwe rechtenbron over.
4. Vergelijk alle velden, relaties en fotobytes opnieuw, zonder herstelwrites bij
   verificatie. Gewijzigde bron, onbekende velden of conflicten stoppen de taak.
5. Maak de bewezen native profielen leesbaar onder schrijfstop; sluit vervolgens
   oude accountroutes in Apps Script. Activeer conditioneel de native autoriteit
   en controleer de gegevens opnieuw. De tussenfase is veilig hervatbaar.

De browser leest alleen de taakstatus en mag dicht. Nieuwe uitvoering bij verlopen
machtiging vereist opnieuw een actuele bevoegde start; de oude eindtijd verandert
niet. Geen gebruikerslogin via een servicetoken of tijdelijke authenticatiebypass.

## Wat niet opnieuw verhuist

Shows, Showbeheer, concerten, artiesten, onderzoeksgegevens en Rapportages zijn
al native. Oude Supabase Shows-tabellen en Drive-originelen zijn archieven, geen
actieve runtimebron. Ze worden niet verwijderd of opnieuw als bron geactiveerd.
De oude GOOGLE_DRIVE_SHARED_SECRET-naam blijft voorlopig als serverkey bestaan:
reeds opgeslagen ciphertext en technische handtekeningen hangen daarvan af.
Een gedeelde sleutel intrekken is geen veilige manier om Google-opslag af te sluiten.
De accountfence sluit de oude bedrijfsroute; originele bestanden/deployment blijven.
