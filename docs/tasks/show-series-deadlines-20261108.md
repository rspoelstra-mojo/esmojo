# Showdagen van concertreeksen

Eigenaar: Codex. Branch: task/show-series-deadlines-20261108.
Houd Showdag actueel tot en met de laatste concertdatum: de volgende resterende
showdag bepaalt de actieve deadline, pas daarna is de showdag afgerond.
Behoud voorbereidende deadlines op de eerste reeksdatum. Controleer lijst,
kalender, volgende-weekgroep en Nederlandse middernachtgrenzen. Scope gedeelde
planningslogica, regressietests en websiteversie; geen externe diensten/opslag.

Uitvoering: de showdagdatum schuift naar de eerstvolgende echte resterende dag;
afronding is afgeleid van de Nederlandse datum ná de laatste showdag en wordt
niet als nieuwe status opgeslagen. Lijst toont één actieve showdag per reeks.
Kalender behoudt iedere showdag met unieke datum-ID; afgelopen dagen zijn daar
historisch afgerond. Voeg de expliciet gevraagde groep Volgende week toe, zonder
deze week-/jaartellers of voorbereidende deadlines naar een latere dag te verplaatsen.

Validatie: 26 gedeelde planningtests plus bestaande home-/showpagina-tests en build
slagen. Acht browsergevallen (390/1440px, vóór/tijdens/na de reeks) controleren
Volgende week, Vandaag, verdwijnen ná de laatste dag, canonieke link en alle
kalenderdagen. Extra regressies voor dubbele datums, reeks met tussendag,
actuele importdatums, laatste-dag-inclusiviteit, jaarwisseling en zomer-/wintertijd.
Websiteversie V1.75; geen Apps Script-, Drive- of Supabase-aanpassingen.
