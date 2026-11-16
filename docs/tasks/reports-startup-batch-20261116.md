# Rapportages: technische koude start bundelen

Eigenaar account B; branch task/reports-startup-batch-20261116 vanaf actuele main.
Vervolg PR195: warm mediaan484ms/max665ms; nieuwe verbinding1115ms (toegang736ms, lezen379ms). Doel resterende technische netwerkoverhead verminderen door uitsluitend vaste read-only omgeving/taal/schema-verzoeken in één Dataverse-batch te bundelen. Geen businessreads vóór huidige autorisatie, geen rechten-TTL, huidige tokenvernieuwing/validatie behouden. Tests, publicatie en echte productiemeting. Auth blijft Supabase. Geen zakelijke writes/mails.
