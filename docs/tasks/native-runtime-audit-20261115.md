# Native opslag en website dubbelcheck

Eigenaar huidige Codex-uitvoering; branch task/native-runtime-audit-20261115.
Gebruiker vraagt actieve Dataverse-routes en bestaande websitewerking te controleren
en aantoonbare fouten af te werken. Supabase Auth blijft behouden. Redis-activering
niet aannemen; verse MFA-taak blijft vereist. Geen heropening Drive, fictieve
bedrijfsgegevens, echte testmails of authbypass. Inspecteer actuele bron, lopende
workers en productie, voer passende server-/browsertests uit. Breid zo nodig de
vaste main/OIDC read-only controle uit met actuele rechten, veilige codes/tellingen.
Publicatiebewijs, daadwerkelijke opslagautoriteit en beperkingen apart vastleggen.

Broninventaris: productie blokkeert de oude ondertekende Drive-bruggen en de
Supabase-bedrijfstabellen vóór netwerk/clientcreatie. Accounts, Showbeheer,
Shows/research en Reports kiezen native autoriteiten. Oude code blijft uitsluitend
voor offline fixtures/provenance; lokaal hergebruikte Apps Script-rekenregels zijn
geen Google-netwerkopslag. Auth gebruikt Supabase. MOJO blijft toegestane externe
agenda/tijdschema/fotobron; Resend blijft mailtransport. Redis alleen na echte
native autoriteitsread als omgeschakeld melden.

Nieuwe vaste read-only auditstappen via bestaande main/OIDC incidentroute:
authority, accounts, shows, reports, files. Iedere stap actuele beheerder + alle
modules; geen actor/record-ID/query vanuit workflow. Accounts inclusief private
foto-readback; twee bestaande Shows-series en tien pure regelsreads zonder commit;
alle getypeerde rapportmetrics, mailhistorie, CSV-steekproef per bronsoort inclusief
oudste rapport en één werkelijk bestaande PDF. Alleen booleans/tellingen/codes.
Geen oude taakgrant verlengd, geen zakelijke write/testmail of schemawijziging.

Lokaal: 154 gerichte rechten/native-regressietests en 10 audit/workflowtests groen.
Alle 11 bestaande Chrome-UI-scripts en build worden afzonderlijk gecontroleerd.
Vercel error/fatal-telling laatste uur leeg. Geen ingelogde browser beschikbaar;
geen echte interactieve accounttest claimen. Productie-audit volgt na publicatie.
