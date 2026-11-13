# Accountstatus en modulerechten

Uitsluitend deze twee onderdelen krijgen na expliciet goedgekeurde activering
Dataverse als actuele bron. Namen, e-mail, organisatie, functie, profielfoto en
beheerderrol blijven in het private Drive-register. Supabase Auth, TOTP en het
bestaande sessiegebonden MFA-bewijs blijven verplicht. Geen nieuwe browseropslag.

## Beheerkaart en bestaande definities

Beheerder → Datatransitie bevat de fluid kaart **Snelle toegangscontrole**.
**Voorbereiden, controleren en activeren** start één duurzame servertaak. Geen
nieuwe tabellen, kolommen of keuzelijsten: de bestaande Vertrouwelijke tabellen
Integratiestatus en Opdracht worden hergebruikt. Bestaande Medewerker/Modulerecht-
kopieën voor Shows-relaties blijven afhankelijkheden, geen tweede rechtenbron.
Elke live rechtencontrole leest het actuele bronbeleid en eigen accountrecord
in één Dataverse-aanvraag. Technische OAuth/schema-sessies zijn gedeeld; rechten
worden nooit gecachet. Alle overige module- en beheerdercontroles blijven bestaan.

Per-account records bewaren alleen account-ID, activatiestatus, blokkadestatus en
de drie expliciete modulerechten. Effectieve rechten van de vaste superbeheerder
zijn expliciet volledig; de rol zelf wordt niet overgezet. AES-256-GCM gebruikt
een aparte afgeleide sleutel en recordgebonden AAD. Een ontbrekend, onleesbaar of
onzeker record geeft geen toegang. Beleid/vergrendelingen bevatten uitsluitend
technische verificatiegegevens, hashes en tijdelijke statussen.

## Gecontroleerde activering

De bestaande taak-engine controleert iedere stap opnieuw op actuele beheerder-,
Shows- en accountrechten. Delegatie duurt maximaal 48 uur, met globaal slot,
per-taaklease, ETag en versleuteld checkpoint. Geen automatische start bij laden.

1. Controleer bestaande technische opslag en de ondertekende Drive-brug.
2. Blokkeer accountwijzigingen in Node én onder hetzelfde Apps Script-slot als
   accountwrites. Laat bestaande verzoeken minimaal elf minuten uitlopen. Shows
   blijven leesbaar, andere bedrijfsgegevens worden niet gemigreerd.
3. Kopieer uitsluitend actuele status/modules; lees terug en vergelijk alle
   accounts en de ongewijzigde bronsnapshot. Ruim achtergebleven technische
   voorbereidingen op met een geblokkeerd tombstonerecord, nooit bronverwijdering.
4. Activeer de protocolpoort in Apps Script, lees de bron opnieuw, activeer pas
   daarna de versleutelde Dataverse-autoriteit. Oude deployments zonder de nieuwe
   serverclaim worden door de bron geweigerd. Na activering geen stille terugval.

Een fout laat de accountschrijfstop staan voor veilige controle/hervatting; de
beheerkaart meldt de duurzame status. Bij verlopen machtiging kan een huidige
bevoegde beheerder bewust opnieuw starten. Nooit de bronbeveiligingsproperty
handmatig terugzetten of een oud deployment als herstelroute gebruiken.

## Accountwijzigingen na activering

De website blijft de bestaande accounteditor gebruiken. Node controleert de
actuele native actorstatus en leest de actuele Drive-rol. Een ETag-beveiligde
pending-fence blokkeert het doelaccount vóór de bronwrite. Drive valideert rol,
organisatie en de exacte gewenste status opnieuw. Pas na succesvolle bronwrite
én terugleescontrole worden native rechten bevestigd. Drive bewaart de velden
als compatibiliteits-/controlekopie; die kopie verleent geen runtime-toegang.
Rechtstreeks veranderen van deze velden in Drive is geen beheermethode meer.

Een onzekere timeout laat het doelaccount geblokkeerd. **Toegangscontrole opnieuw
controleren** wacht ten minste vijftien minuten en vergelijkt de bron exact met
de verzegelde gewenste of vorige status. Alleen een exacte match heft de fence
op; een andere waarde blijft geblokkeerd voor onderzoek. Geen blinde herhaling,
automatische verruiming of verwijdering van een mogelijk aangemaakt Auth-account.
Rollen en inhoud worden bij herstel niet overgenomen uit technische checkpoints.

## Publiceren, uitvoeren en verifiëren vanuit beide accounts

Publiceer via gewone geteste main-PR, GitHub→Vercel en Publish Apps Script. Beide
uitrollen moeten gereed zijn vóór activering. De gedeelde knop is de normale
beheermethode. De vaste main/OIDC-workflow `account-access.yml` mag op expliciet
verzoek dezelfde taak starten met de oorspronkelijke nog geldige 48u-machtiging
van de afgeronde Shows-migratie. Geen vrije actor, tabel, query of credential in
het request; mislukte/te oude machtiging stopt. De reguliere achtergrondworker
hervat alleen al gestarte geregistreerde taken. Productiegeheimen blijven in hun
bestaande secret stores; geen nieuwe credentials of rechten nodig.

Controleer na activering de veilige taakstatus, actuele moduleweigering, normale
accounteditor, login/MFA en bestaande Shows. `shows-performance.yml` meet opnieuw:
de beheerderrol wordt buiten de getimede snelle eigen-statusread gecontroleerd.
Native backendmetingen zijn geen bewijs van volledige ingelogde browserlaadtijd.
Een seconde mag alleen met passend klik-tot-inhoud/foto-bewijs worden geclaimd.

Integratiestatus heeft ook een unieke combinatie Integratiecode/Scopecode. Elke
accountscope is daarom het eigen stabiele account-ID; het bronbeleid gebruikt
policy. De geteste adapter kan een eerste voorbereide oude accountscope via CAS
op dezelfde recordidentiteit corrigeren, zonder status of rechten te wijzigen.
De vaste workflow met operation=status gebruikt een aparte read-only wachtrij,
zodat diagnostiek niet achter de muterende omschakeling blijft wachten.
