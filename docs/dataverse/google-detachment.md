# Google Drive en Apps Script losgekoppeld

De actieve bedrijfsopslag is Dataverse; Supabase Auth/MFA blijft behouden.
V1.150/PR210 verwijdert de resterende uitvoerbare Shows-afhankelijkheid van
Apps Script-bronbestanden en sluit Google-publicatie permanent af.

## Lokale Shows-regels

server/dataverse-shows/rules/native.js bevat de 103 bereikbare bestaande functies
voor profielen, tickets, afronding, barrieropstelling, vloerdruk, maatregelen,
productie-/operationele risico's en PDF-status. Het zijn lokale JavaScript-regels
zonder Google-serviceobjecten, webapp-ingang, netwerk of externe mapzoeklogica.
De risk-pending-catalogusscan blijft bij de bestaande native Dataverse-service.
De begrensde sandbox ziet uitsluitend de meegegeven lokale documentsnapshot en
bijlagen. Dataverse-repository/writer behoudt typed verificatie, File, versies,
CAS, encryptie, leases, autorisatie en onafhankelijke readback. Geen schemawijziging.

De service-regressies voeren de nieuwe en bewaarde oude regels bij dezelfde
klok en unieke testidentiteiten uit en vergelijken volledige uitkomsten en
foutcodes. De oude regels worden uitsluitend in offline tests gelezen; ze zijn
geen productieafhankelijkheid. Vercel bundelt native.js, geen .gs-bestanden.

## Publicatie

Alleen GitHub → Vercel publiceert ESMOJO. Apps Script-publicatieworkflow,
deploymentconfig en clasp-dependencies zijn verwijderd. Het oude deploycommando
weigert onvoorwaardelijk vóór credentials/commando's/HTTP. Een oude workflow die
actuele main ophaalt kan Google dus niet opnieuw publiceren. Oude documentatie,
.gs-bestanden en migratieherkomst blijven uitsluitend offline historie/bewijs.

De bestaande shows-runtime.yml main/OIDC-route heeft een vaste read-only audit
voor authority/accounts/shows/reports/files. De bestaande normale workeridentiteit
moet per stap actuele beheer- en alle modulerechten hebben. Geen nieuwe/verlengde
taakmachtiging, vrij actorveld, vrije query, bedrijfswrite of performanceproef.
De push-controle wacht eerst op de native-rules-releaseheader. Resultaten zijn
uitsluitend vaste statussen en tellingen; geen bedrijfsinhoud of tokens.

## Externe Google-mappen en het script verwijderen

Na bevestigde Vercel-uitrol en geslaagde native audit zijn de externe ESMOJO-
Drive-mappen en het externe Apps Script-project geen runtime- of publicatiebron
meer. De gebruiker kan die verwijderen. Deze wijziging verwijdert zelf geen
externe bestanden. Bewaarde migratiebewijzen/historische externe IDs zijn geen
links die de runtime alsnog ophaalt. De audit controleert actuele autoriteiten,
accountprofielen/foto's, native Shows-regels, Rapportages/metrics/mailhistorie
en bestaande CSV/PDF-bestandssteekproeven. Het is geen nieuwe volledige
bron/doelvergelijking met Google en ook geen ingelogde gebruikerstest.

Behoud GOOGLE_DRIVE_SHARED_SECRET in Vercel: deze historische naam betreft nu
ook native encryptie en bestaande mailbewijzen. Verwijder/roteer die sleutel
niet samen met Google-credentials; Google Script properties zijn geen bron
voor de native runtime. Supabase Auth- en Dataverse-credentials blijven nodig.
Google OAuth-/Apps Script-publicatiecredentials zijn geen actieve afhankelijkheid;
een afzonderlijke credentialopschoning moet de cryptografische sleutel behouden.
