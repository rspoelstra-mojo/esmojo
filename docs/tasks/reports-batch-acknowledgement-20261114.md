# Rapportages: bevestigde batch automatisch herkennen

Eigenaar Codex account A; task/reports-batch-acknowledgement-20261114.
Live read-only diagnose bevestigt bij de geblokkeerde 27e rapportage alle32
incidentregels exact aanwezig, zonder ontbrekende of afwijkende waarden/lookups.
Bron/CSV/mapping identiek aan checkpoint;95 geplande records, index2. De vaste
bewezen resume uit PR165 is gestart. Structureel: een verloren batchbevestiging
mag niet blijven blokkeren wanneer onafhankelijke exacte teruglezing alles bewijst.
Bij onzekere technische writes maximaal bestaande acht retries,15min uitsluiting,
48u niet verlengen; bekende native weigeringen en inhoudelijke conflicten stoppen.
Geen herupload/overschrijven/bronwijziging of andere migraties. Alleen gedeelde
batchwriter (behoud Shows), Reports-failurepolicy, gerichte regressietests/docs.
