# Google Drive-aansluiting

Status: servermodule voorbereid, niet live verbonden of getest. Geen publieke
API-route. Geen echte bestanden aangemaakt of gelezen.

De gebruiker staat verwerking van vertrouwelijke informatie door Vercel toe,
met Google Drive als opslag. De map in de zakelijke Mijn Drive is
1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk. Maak deze map niet openbaar.

## Autorisatie die nog moet worden ingesteld

1. Maak/selecteer een bedrijfsbeheerd Google Cloud-project voor ESMOJO en activeer
   de Google Drive API. Dit project beheert de API-toegang; gegevens blijven in
   Workspace Drive. Organisatiebeleid kan hiervoor beheerdersrechten vereisen.
2. Configureer Google Auth Platform, bij voorkeur met doelgroep Internal binnen
   de Workspace-organisatie. Als Internal niet beschikbaar is, onderzoek eerst
   het organisatiebeleid. Externe apps in Testing kunnen refresh tokens krijgen
   die na zeven dagen verlopen; behandel dat niet als productieconfiguratie.
3. Kies autorisatiescopes pas na uitleg en toestemming. drive.file geeft toegang
   tot app-aangemaakte of expliciet via Picker geselecteerde bestanden, niet
   automatisch tot alle bestaande/toekomstige bestanden in een gekozen map.
   Imports van JSON die een andere app in de map zet kunnen bredere Drive-toegang
   vereisen. De mapbeperking in onze code beperkt niet de OAuth-rechten zelf.
4. Bouw een afgeschermde OAuth-setupflow met state-validatie en een exact
   geregistreerde redirect-URI. Vraag offline toegang voor een refresh token.
   Plaats geen tokens in URL's, logs of broncode. Gebruik geen openbare
   token-generator van derden om toegang tot de bedrijfs-Drive te geven.
5. Bewaar GOOGLE_CLIENT_ID als configuratie en GOOGLE_CLIENT_SECRET plus
   GOOGLE_REFRESH_TOKEN als secrets in het betreffende Vercel-project. Gebruik
   geen VITE_-prefix. De gebruiker deelt deze secrets niet in chat.

## Test en ingebruikname

De module server/google-drive.js hergebruikt toegangstokens kortstondig in het
servergeheugen. Bestandsinhoud wordt niet persistent gecachet of gelogd.
Nieuwe JSON-bestanden worden alleen in de vastgelegde map gemaakt. Lezen
controleert maplidmaatschap, MIME-type en maximaal 1 MB. Lijsten zijn gepagineerd.
Er is geen automatische retry van writes: die zou dubbele bestanden veroorzaken.

Test na autorisatie met fictieve JSON: aanmaken, terugvinden en teruglezen;
controleer ook een geweigerd bestand buiten de map. Echte gegevens pas na hun
classificatie en een afgesproken JSON-schema. Werk medewerkersauthenticatie en
rechten uit voordat een website-endpoint deze module kan aanroepen. Het zakelijke
Google-account dat autoriseert is de technische identiteit; collega's krijgen
niet automatisch diezelfde toegang. Intrekken van Google-toegang moet de
verbinding blokkeren.

Een serviceaccount is geen standaardoplossing voor deze Mijn Drive-map: het heeft
geen eigen opslagquota en kan niet zomaar nieuwe bestanden bezitten. Verplaats
naar een gedeelde Drive als later voor een serviceaccount wordt gekozen.
