# Openingsstatus van showmails

Beheerder → Email heeft twee kaarten. De rapportagekaart toont maximaal de tien
meest recente verzonden rapportagemailgroepen, met alle bevestigde verzonden
ontvangers in een overlay. Een concert/showdatum/CSV-versie vormt één groep;
ontvangers vormen geen losse lijstregels. De showprofielkaart is voorbereid en
blijft leeg totdat de toekomstige showprofielmailflow is aangesloten.

De gebruiker heeft ontvangergebonden registratie en het eerste openingsmoment
expliciet Vertrouwelijk verklaard. Alle registratie staat bij de bestaande
verzending in `_esmojo_ontrack_v1.json` in de bestaande private Drive-map. Vercel
verwerkt de beveiligde verzoeken; geen Supabase, Redis, browseropslag, IP- of
apparaatregistratie, trackingpixels of externe klikwebhooks.

## Betekenis van de vinkjes

Nieuwe `online-report-v4`-mails hebben een ontvangergebonden opaque token in het
fragment `#mail-open=…`. Dat fragment gaat niet mee in het HTTP-paginaverzoek.
Na bestaande login/MFA, geslaagd renderen van de bedoelde rapportage en zichtbaar
worden van de pagina registreert de browser op de achtergrond. De server en
Drive controleren de actuele ontvanger, module, concert, token en mailpoging.
Andere gebruikers, gewone menubezoeken, mislukte rapportreads en anonieme
mailfilterscans kunnen geen vinkje voor de ontvanger veroorzaken.

Een vinkje betekent: de bedoelde ingelogde ontvanger heeft de rapportage via
zijn maillink geopend. Het bewijst niet dat de inhoud is gelezen. Bij een
achtergrondtab wachten we tot deze zichtbaar wordt; prerenderen telt niet mee.
Doorgestuurde links tellen niet als opening door de oorspronkelijke ontvanger
als een ander account ze gebruikt. Het eerste tijdstip wordt niet overschreven.
Een valide ontvangstbewijs mag vóór de providercommit worden opgeslagen zonder
de verzendstatus te wijzigen; de geschiedenis toont pas bevestigde verzendingen.

Oudere mails zonder token hebben onbekende klikstatus: een gemengd vinkje en
‘Geen klikregistratie beschikbaar voor deze eerdere mail’. Geen historische
klikken verzinnen en oude mails niet opnieuw versturen om registratie te krijgen.
Het overzicht wordt bij focus en het openen van een ontvangersoverlay ververst.

## Routes en uitrol

`report-email-history` is een alleen-lezen beheerderroute met Rapportages-module.
`report-email-open` accepteert uitsluitend concert-ID en token; de actor komt
altijd uit de gevalideerde sessie. Drive controleert rechten onafhankelijk.
De history-response bevat nooit tokens, provider-ID's, bronhashes of CSV-inhoud.
Schrijven is idempotent en gebruikt de bestaande achtergrondopslag/herpoging.

Apps Script adverteert ondersteuning bij de bestaande sync-/pipeline-response.
Alleen een worker die `trackingVersion=mail-open-v1` meestuurt krijgt nieuwe
v4-afleveringen. Oude v1/v2/v3-retries houden hun exacte mailinhoud, ontvanger en
idempotentiesleutel; een oude worker mag geen gereserveerde v4-mail overnemen.
Geen wijziging van verzendmoment, ontvangerselectie, PDF-afhandeling of accounts.

Bij uitrol: controleer CI, Vercel en de bestaande Apps Script-publicatieworkflow.
Browsertests gebruiken geïsoleerde fixtures; tests versturen geen echte e-mails.
Beide serverlagen zijn nodig voordat nieuwe mails klikregistratie meekrijgen.
