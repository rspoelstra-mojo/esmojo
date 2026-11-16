# Inlogachtergrond en beheerinstellingen

Eigenaar: Codex, deze uitvoering. Branch: task/login-background-settings-20261116.

Doel: aangeleverde podiumfoto als inlogachtergrond, passend rechts van het bestaande inlogvenster; Beheerder / Instellingen met foto-upload, sleepbare uitsnede en echte inlogpreview. Dataverse als opslag, actuele servercontrole voor beheerwrites, Supabase Auth/MFA ongewijzigd. Gebruiker heeft publieke foto/uitsnede en Dataverse-opslag bevestigd. Nieuwe geïsoleerde tabel Website-instellingen met File, config/revisie en hash; gebruiker autoriseert een setupknop in Datatransitie. Geen gedeeld Shows-schema wijzigen.

Verwachte bestanden: src/auth.js, src/accounts.css, src/main.js, nieuwe instellingen-/previewmodules, shared geometrie, serverinstellingen met geïsoleerde Dataverse Website-instellingen/File-opslag, api/access-routering, relevante tests en documentatie. Geen andere taken of work/ aanraken. Geen Google/Redis.

Bestaande foto wordt behouden. Publicatie en runtimeverificatie via bestaande zakelijke GitHub/Vercel.

Implementatie: vaste nieuwe tabel met 8 kolommen, één unieke sleutel, geen keuzes/relaties. Expliciete setupknop initialiseert de aangeleverde openbare foto alleen bij ontbrekende instellingen. Eerste standaardpresentatie is gebundeld beschikbaar; daadwerkelijk Dataverse-opslagbewijs volgt na de beheerklik. Desktop/mobiele preview, sleep-/toetsbediening, zoom, upload (3 MiB), autosave, CAS en volledige file-readback. Zie docs/dataverse/website-settings.md.
