# Kortetermijngeheugen voor recente shows

Eigenaar: Codex. Branch: task/show-memory-20261103.

De gebruiker vraagt recent volledig geladen shows bij kort weg- en terugnavigeren
te hergebruiken en wijzigingen na opslaan te verwerken. Bewaar maximaal vijf shows
vijftien minuten na verlaten uitsluitend in sessie-geheugen; wis bij afmelden of
refresh. Hergebruik bestaande showcontext, wacht op lopende writes en ververs
alleen ontbrekende/ongeldige gegevens. Geen wijziging van Drive-opslag/autorisatie.
Verwachte bestanden: show-data, showpagina, sessiegeheugen, hoofdmenu-afmeldcleanup,
gerichte tests en documentatie. Websiteversie V1.11.

## Uitvoering en controles

De showcontext wordt met leases tijdelijk gedeeld tussen opeenvolgende
paginaweergaven. De laatste tab en openbare fotometadata blijven beschikbaar.
Lopende writes worden afgewacht; alleen ongeldige afhankelijke gegevens worden
ververst. Account-/rolwisseling en afmelden wissen alle contexten, ook bij late
antwoorden. Een harde refresh begint met leeg geheugen.

Negen gerichte geheugentests en bestaande laad-/opslagtests geslaagd. Chromium
met fictieve Drive-fixtures controleerde terugkeer zonder tweede bundel, meerdere
shows, tabherstel, wachten op lopende opslag, actuele vloerdruk na gewijzigde
barrierkeuze, geheugen wissen en harde refresh. Geen productiedata gebruikt.
