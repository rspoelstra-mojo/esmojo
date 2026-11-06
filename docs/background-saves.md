# Standaard achtergrondopslag

Alle zakelijke mutaties via `auth.access` worden centraal geregistreerd in
`src/lib/background-saves.js`. Reads, downloads, veldleases en auth-handshakes
blijven aparte handelingen. Een Opslaan-/afrondknop valideert lokaal en geeft
navigatie meteen vrij. Het serverantwoord, niet de klik, bevestigt opgeslagen/
afgerond. Account-/MFA-/module-/bron-/revisiecontroles blijven vereist.

De centrale activiteitsteller volgt lopende verzoeken zonder laadmelding. Een
melding buiten de pagina laat uitsluitend onbevestigde opslagfouten zien met een interne herstelroute. Registratie bevat label/route/technische sleutel;
geen serverfoutinhoud of persoonsgegevens in de melding. Een geslaagde herpoging
wist alleen de fout van dezelfde resource. Geen automatische retries van onzekere
writes. De expliciete lokale invoer blijft in de bestaande queues of tijdelijke
formulieren beschikbaar. Er is geen nieuwe persistente browseropslag of backend.

De centrale save-activity heeft `track`, `watch`, `form`, `fail`, `clear` en
`installSaveExitWarning`. Gebruik `watch` voor debounce, voorbereiding en nog
wachtende taken. `createAssessmentQueue` serialiseert concepten, tekstupdates en
afrondacties met actuele serverrevisies; verdere invoer tijdens een lopende write
wordt niet als al opgeslagen behandeld. Navigatie verwijdert alleen de weergave.
Afmelden/rechtenwissel annuleert nog niet begonnen werk en wist queues/formulieren.
Een sessiegeneratie voorkomt dat oude taken onder een ander account starten.

Bezoekersgegevens serialiseren eigen veldwrites maar laten andere velden en de
terugknop bruikbaar. Een lopende veldlease wordt niet voortijdig vrijgegeven bij
navigatie. Alleen de opgeslagen kaart wordt vernieuwd, zodat typen in een ander
veld doorgaat. Analyseafronding sluit de overlay meteen en behoudt bij fouten
score/tekst. Accountopslag keert direct terug naar de bestaande lijst en laat
andere accounts bewerkbaar; vertraagde resultaten overschrijven geen nieuw formulier.

Voor afsluiten/refreshtab/ander document gebruikt ESMOJO `beforeunload` zolang er
open verwerking of onbevestigde opslag is. De aangevraagde tekst wordt als
legacy returnValue gezet; moderne browsers tonen hun eigen generieke waarschuwing
en vereisen een eerdere gebruikersinteractie. Bewust afmelden gebruikt de exacte
tekst als bevestiging. Wie afsluiten toch forceert kan nog niet verstuurde gegevens
verliezen. Geen vertrouwelijke sendBeacon- of keepalive-route toegevoegd.

Nieuwe componenten gebruiken dezelfde routes en queues, blokkeren niet de volledige
pagina en bewaren geen inhoud in logs/analytics/Storage APIs. Downloads en expliciete
mailacties behouden hun bestaande doel/trigger; er worden geen extra mails verstuurd.

Controle: centrale queue-/afsluit-/sessietests in src/lib/background-saves.test.js,
bestaande auth/risico-/contexttests en browsertests met vertraagde/falende synthetische
verzoeken. De echte showpagina gebruikt daarbij de bestaande signed Drive-fixture;
account-/bezoekers-/analyse-UI gebruikt synthetische serverantwoorden. Geen echte
accounts, mails of vertrouwelijke productiewrites voor tests.
