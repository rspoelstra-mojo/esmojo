# Herstel gedeeltelijke artiestscore
Eigenaar huidige Codex-sessie; branch task/restore-partial-risk-20261110.
Gebruiker herstelt expliciet incident-only score en gele/groene statuslabels.
Behoud nieuw beveiligingsuitschietermodel25/medisch10, nulreferentiebetrouwbaarheid,
deduplicatie en bestaande volledige dataset. Bij geen volledig beoordeeld concert:
alleen geschikte betrouwbare incidentrapporten, ontbrekende onderdelen null, geen
risicoklasse; maximaal35 van100 beschikbaar. Volledig krijgt groen en risicoklasse.
Geen nieuwe opslag, import of referentieherbouw. Versie blijft V1.99.

26 reken-/API-controles slagen, inclusief gedeeltelijke uitschieter19, nulscore,
volledige score, ontbrekende incidentdata en onbetrouwbare referenties. Browser
controleert beide labels, cijfers/segmenten, ontbrekende onderdelen, mobiele en
desktopindeling in beide thema's. Build en diff-check slagen. Formule/drempels
zijn niet gewijzigd; alleen beschikbaarheid van betrouwbare incident-only score.
