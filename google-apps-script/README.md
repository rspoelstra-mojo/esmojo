# ESMOJO Drive-test via Apps Script

De gebruiker heeft een geslaagde live statuscheck bevestigd: Vercel bereikt de
ESMOJO-map via een ondertekend verzoek, in die meting in 1092 ms. De tijdelijke
testpagina is daarna op verzoek verwijderd. De OAuth-instelroute blijft eveneens
verwijderd. De bestaande OAuth-Drive-module wordt niet
gebruikt. Deze eerste versie biedt uitsluitend een statuscheck, geen inhoudelijke
bestandsgegevens, imports of writes.

## Eerst in Google testen

1. Maak een Apps Script-project ESMOJO Drive-koppeling.
2. Vervang de inhoud van Code.gs door Code.gs uit deze map en sla op.
3. Selecteer testConnection bovenin en klik Uitvoeren.
4. Geef eenmalig Google-toestemming voor het script onder je eigen account.
   Het script gebruikt DriveApp met de rechten van de eigenaar; die rechten zijn
   niet door Google beperkt tot alleen de ESMOJO-map. Onze code fixeert de map.
5. De uitvoeringslog moet bevestigen dat de map bereikbaar is. Er worden geen
   bestanden gewijzigd. Er staat geen secret in deze code.

## Daarna verbinding vanuit Vercel testen

Genereer in een wachtwoordmanager een uniek willekeurig geheim van minimaal 32
tekens. Bewaar dit in Apps Script bij Projectinstellingen → Script properties
als ESMOJO_SHARED_SECRET. Bewaar exact dezelfde waarde als Secret in Vercel
Production onder GOOGLE_DRIVE_SHARED_SECRET, nooit met een VITE_-prefix.

Deploy als webapp, uitvoeren als jezelf. Voor serververkeer zonder Google-login
is de netwerktoegang Anyone nodig. Dat maakt de URL bereikbaar, maar onze code
weigert Drive-controles zonder geldige HMAC-ondertekening. De map zelf blijft
beperkt gedeeld. Dit is toepassingsauthenticatie, geen anonieme bestandstoegang.
Als organisatiebeleid Anyone verbiedt, omzeil dat niet en meld de beperking.

Bewaar de webapp-URL met /exec als GOOGLE_DRIVE_SCRIPT_URL in Vercel Production.
Nieuwe Apps Script-code vereist een nieuwe deploymentversie. De Vercel-adapter
server/apps-script.js kan dan een ondertekende statuscheck uitvoeren. Er is nog
geen website-endpoint; voeg geen publieke bestandsroute toe zonder medewerkers-
authenticatie. Deel geen secrets, logs met credentials of autorisatietokens.

De tijdelijke testpagina, route en formuliercode zijn verwijderd. Herstel deze
niet automatisch. De serveradapter en Apps Script-webapp blijven behouden voor
toekomstige functies. GOOGLE_DRIVE_SCRIPT_URL, GOOGLE_DRIVE_SHARED_SECRET en
ESMOJO_SHARED_SECRET blijven noodzakelijk en mogen bij deze opruiming niet worden
verwijderd. De koppeling bevestigt alleen bereikbaarheid; lezen, schrijven en
importeren van bestanden zijn nog niet geïmplementeerd.

De statuscheck accepteert een tijdsvenster van twee minuten. Hij is alleen-lezen
en kan veilig herhaald worden. Voeg voor toekomstige schrijfacties expliciete
autorisatie, schemavalidatie en replay-/dubbele-verwerkingsbescherming toe.

Apps Script heeft quota, uitvoeringstijdlimieten en soms opstartvertraging. Meet
de echte responstijd voordat dit als productieopslag wordt gekozen. Gebruik geen
Drive-verzoek bij elke menuactie. Vertrouwelijke gegevens mogen door Vercel worden
verwerkt maar niet in Supabase of logs worden opgeslagen.
