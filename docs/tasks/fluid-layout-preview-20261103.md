# Afgeschermde fluid-layoutproef — NIET MERGEN

Eigenaar: Codex. Branch: task/fluid-layout-preview-20261103.

De gebruiker geeft uitsluitend toestemming voor een geïsoleerde testomgeving.
Deze branch en draft-PR blijven buiten main; geen publicatie naar esmojo.nl,
geen productieroutes, versie, menu-opmaak, Drive-data of Apps Script wijzigen.
Gebruik de bestaande login/MFA en beheerderrol voor testtoegang, scoped fluid-
wrapper/CSS, bestaande showcomponenten en uitsluitend gegarandeerd pure reads.
Alle muterende API's in deze preview worden aan de server geblokkeerd. Geen
indexering of echte onderzoeksinhoud in builds/tests/logs. Doelroute in de preview:
/test/fluid-layout. Controleer 1280/1440/1920/2560 px, menugelijkheid en read-only.

## Uitvoering

Centrale expliciete fluid-wrapper/CSS en hergebruik van bestaande showcomponenten.
De preview is serverzijdig alleen-lezen, vereist beheerder + MFA en sluit overige
API's af. Alleen de testroute is toegevoegd op deze previewbranch. Geen wijziging
van index.html, bestaande CSS-bestanden, Apps Script, validators of productieversie.
Vloerdruk-details zijn geblokkeerd vanwege bestaande schrijfbare leesroute.

Browsercontroles met fictieve data: 1280/1440/1920/2560, contentbreedtes
938/1098/1578/2218 px, menu's exact gelijk, tabjes/details/overlay, kleinere
vensters zonder overflow en normale pagina terug naar max1000. Servertests:
admin/MFA, deny-by-default, pure reads met nul Drive-writes, andere API's dicht.
Technische beschrijving en toegang: docs/fluid-layout-preview.md.

## Herstel preview-aanmelding

Na de melding na MFA is de aparte Drive-afhankelijkheid van de preview verwijderd.
Account/rol/sessie en showgegevens lopen via een vaste, alleen-lezen serveradapter
naar de bestaande API op esmojo.nl. Geen cookies/refresh-tokens, mutaties of vrije
URL's worden doorgestuurd. Productie blijft ongewijzigd. Nieuwe regressietests en
een volledige browser-aanmeldflow met ontbrekende preview-Drive-config slagen.
