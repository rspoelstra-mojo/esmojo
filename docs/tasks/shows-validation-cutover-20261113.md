# Shows: eindvalidatie en gecontroleerde omschakeling

Eigenaar huidige Codex-sessie; branch task/shows-validation-cutover-20261113.
Gebruiker autoriseert op 13 november achtereenvolgens eindvalidatie van de
Dataverse-kopie en omschakeling van de Shows-module. Dit vervangt de eerdere
no-cutover-beperking uitsluitend voor deze module; originelen behouden.
Begin met een afzonderlijke bron/doelcontrole zonder bedrijfsdatawrites. Bouw en
test daarna volledige lees-/schrijfproviders, concurrency, bestanden en bestaande
rechten. Omschakeling uitsluitend na bevestigde validatie en laatste delta/
watermark, zonder dubbele schrijvers of stille terugval. Auth en andere modules
blijven buiten de omschakeling. Geen incident-, account- of tokeninhoud in Git/logs.
