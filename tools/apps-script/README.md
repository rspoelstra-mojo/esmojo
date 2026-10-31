# Automatische Apps Script-publicatie

De workflow Publish Apps Script draait alleen op main, bij script- of
publicatietoolwijzigingen, of handmatig via Actions. Publicatie staat los van de
Vercel-build en voegt niets toe aan de frontendbundel.

Script-ID en bestaande deployment-ID staan in deployment.json. De workflow
controleert dat de bestaande deployment bestaat, haalt de huidige scriptbron en
het manifest op in een tijdelijke directory, neemt de Git-broncode over en
publiceert een nieuwe versie op dezelfde deployment-ID. Andere remote bestanden
en het manifest blijven behouden; Script properties worden niet gewijzigd.
Verwijderen van remote scriptbestanden wordt bewust niet automatisch gedaan.
Doe toekomstige codewijzigingen in Git; een handmatige wijziging aan Code.gs in
de Google-editor kan anders bij de volgende publicatie worden overschreven.

## Eenmalige autorisatie

1. Schakel Google Apps Script API in via https://script.google.com/home/usersettings.
2. Gebruik op je eigen computer Node.js 22 of nieuwer en voer uit:
   npx --yes @google/clasp@3.4.1 login
3. Log in met het Google-account dat eigenaar is van de bestaande webapp en geef
   toestemming. Dit gebruikt Googles clasp-client; herstel de oude eigen OAuth-
   client van ESMOJO niet. Kies geen serviceaccount voor de bestaande deployment.
4. clasp bewaart autorisatie in .clasprc.json in je gebruikersmap. Kopieer de
   volledige JSON uitsluitend naar GitHub → repository esmojo → Settings →
   Secrets and variables → Actions → New repository secret, naam CLASPRC_JSON.
   Deel de inhoud niet in chat, screenshots, commits of logs. Bewaar de lokale
   credentialfile afgeschermd. Dit geheim is krachtiger dan het Drive-verbindings-
   geheim: het geeft de automation toegang onder jouw Google-identiteit.
5. Start in GitHub Actions Publish Apps Script → Run workflow op main.

De agent heeft geen bevestigde Google-publicatiecredentials of GitHub Actions-
secretbeheertoegang. Credentials moeten via bovenstaande veilige route worden
toegevoegd. De eerste echte workflow-run en live publicatie zijn nog niet bewezen.
Lokale mocks valideren de volgorde en het behoud van manifest en deployment-ID,
maar vervangen de eerste echte publicatie niet.

Secrets worden alleen beschikbaar gemaakt aan de publicatiestap, niet aan tests
of pull requests. Bewaar geen confidential Drive-data in GitHub. De workflow
gebruikt geen GOOGLE_DRIVE_SHARED_SECRET en leest geen Drive-bestandsinhoud.

Bij clasp-fouten: controleer API-schakelaar, Google-login, eigenaarschap van de
deployment en geldigheid van de autorisatie. Ontbrekende of ingetrokken toegang
kan opnieuw inloggen vereisen. Bewaar vorige Apps Script-versies voor rollback.
Een gefaalde push of deployment wordt als fout gemeld; de oude gepubliceerde
versie blijft actief zolang het deployment-updatecommando niet is geslaagd.
De ongetekende HTTP-statuscheck bewijst bereikbaarheid en weigering van anonieme
toegang, niet het lezen/schrijven van gegevens of medewerkersautorisatie.
