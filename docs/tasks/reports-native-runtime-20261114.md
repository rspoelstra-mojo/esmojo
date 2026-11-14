# Native Rapportages-runtime en gecontroleerde omschakeling
Eigenaar Codex; branch task/reports-native-runtime-20261114 vanaf actuele main
1df6184e496e93f0e9626fd8bff70bee081710eb (V1.112).
Gebruiker autoriseert volledige native lees-/schrijfdekking en daadwerkelijke
Rapportages-cutover na actuele bron/doel/File-validatie, met oorspronkelijke
bestanden, CSV17/parser/KPI/TSC/versies/mail/ontvangers/opens en rechten behouden.
Geen andere module/Auth omschakelen, geen testmails/fictieve zakelijke records.
Verloren batchantwoord vraagt onafhankelijke readback; gedeelde writer gebruikt
bestaande verbinding/tokenvernieuwing. Read-only controles repareren geen data.
Voorziene scope: Reports-runtime/provider, rapportagewerkers/integratiegrens,
gecontroleerde authority/freeze/validatie, bestaande API/UI-contracten en tests.

Toegang opnieuw gecontroleerd: Git fetch werkt; GitHub API/GraphQL (gh user,
PR-list, commit-read) geven Forbidden; esmojo.nl CONNECT geweigerd door de huidige
Cloud-netwerkpolicy. Geen Vercel/GitHub-plugin in beschikbare tools, geen runtime-
secrets/identiteiten. Dit is een sessiebeperking, niet afgeleid uit de rechten
van de andere sessie. Draft-PR en live checkpoint/deployment/ingelogde controles
zijn daardoor nog niet uitvoerbaar. Taakregistratie via Git staat wel klaar.
