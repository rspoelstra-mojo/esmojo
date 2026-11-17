# Showbeheer PDF delen en anonieme gebruikstelling

Eigenaar: deze Codex-uitvoering. Branch: task/showbeheer-pdf-sharing-20261117.

Gebruiker autoriseert implementatie/publicatie van één geheime Showbeheer-link met PIN, gewone beveiligde downloadknop in blok E en beperkte sessie. Alleen de gereedstaande actuele Showprofiel-PDF extern; geen analyses, risicoresultaten of andere documenten. Vervalt om Nederlandse middernacht na de laatste showdag van de canonieke reeks, ook bij eerder geopende sessies. De ESM mag de mailto-knop zien/gebruiken zodra het showprofiel volledig afgerond/PDF gereed is, zonder 30-dagenbeperking. Mailto bevat alleen pincode en geheime link, geen ontvangers/onderwerp/overige tekst. Geen automatische verzending of wijziging andere Resend-stromen.

Tel bezoek pas na juiste PIN en zichtbare pagina, eenmaal per beveiligde sessie; registreer laatste opening en succesvolle PDF-uitgiften. Geen IP, naam, e-mail, apparaatidentiteit, analytics of inhoud/token in logs/browseropslag. Beheerdersoverzicht met huidige rechten. Alles in Dataverse; indien nieuwe tabel/kolom nodig blijkt, beveiligde setupknop in Datatransitie. Hergebruik bestaand schema alleen als betekenis/keys aantoonbaar passen. Behoud Supabase Auth/MFA, Gashouder-grens en schema/autoriteiten van andere modules. Nieuwe expliciete toestemming voor deze vertrouwelijke PDF achter link+PIN vervangt de oude uitsluiting van showprofielen via Showbeheer. Geen fictieve productiegegevens, testmails, authbypass of performanceoptimalisatie. Bestaande originelen behouden.

Scope: Showbeheer service/native repository/API/browser, PDF-readiness/scoping, adminoverzicht, tests, docs en zo nodig Datatransitie-schema/setup. Eerst draft-PR, dan implementatie; publicatie en verificatie afzonderlijk bewijzen.
