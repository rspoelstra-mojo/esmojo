# Reports-activering: native terugleescontrole

Eigenaar huidige Codex-sessie; branch task/reports-activation-fix-20261115 vanaf
actuele main 7abccfa. V1.119 en Apps Script 94 zijn gepubliceerd; cutoverrun
43691897007 stopte vóór de authoritywissel, in preflight zonder zakelijke writes,
code REPORT_CONFLICT. De gebruiker vraagt directe publicatie zonder lange stop.

Scope native Reports-terugleescontrole, gesloten diagnose en uitsluitend veilige
technische hervatting van dit ongeleasede preflightcheckpoint met dezelfde actor,
epoch/sequence en oorspronkelijke eindtijd. Native DateTime moet dezelfde normale
secondenrepresentatie accepteren als de bestaande migratiewriter. Geen schema-
wijziging, zakelijke reparatie, mails of nieuwe machtiging. Registratie vóór fix.

Herstel: native bronmomenten accepteren nu dezelfde exacte óf op seconden
afgeronde representatie als migratieverificatie; de oorspronkelijke milliseconden
blijven uit herkomst gebruikt. Synthetische regressie bewijst dit zonder writes.
Protocol 3 kan uitsluitend de oude geblokkeerde preflight zonder cursor/lease/
onzekerheid hervatten als beide authorities nog legacy zijn. Actor/eindtijd,
epoch en sequence blijven exact gelijk; iedere volgende ronde gebruikt weer {}.
Gesloten foutcodes onderscheiden catalogus- en settingscontroles. V1.120.
