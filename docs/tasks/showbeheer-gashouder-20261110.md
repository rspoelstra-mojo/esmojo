# Showbeheer Gashouder

Eigenaar: Codex. Branch task/showbeheer-gashouder-20261110.

Bouw optioneel Showbeheer onder Projectteam, alleen voor Gashouder. Externe
pincodepagina in bestaande loginvormgeving, vijf lege kaarten; Gashouderkaart
met vier nog lege statuskwadranten. Geen wijzigingen aan afrondingscriteria.

Scope: show-page en nieuwe Showbeheer-componenten/CSS, afzonderlijke entry,
beveiligde aanmaak-/leesroute via huidige account/MFA, aparte PIN-route,
ondertekende Apps Script/Drive-opslag, routing/build en functionele controles.
Geen verzending: knop voorlopig zonder werking.

Nieuwe gegevensclassificatie eerst aan gebruiker gevraagd; opslag/verwerking
wacht daarop. Onafhankelijke vormgeving kan alvast worden voorbereid.
PR API geeft Forbidden; taakbranch registreert werk volgens samenwerken.md.
Websiteversie blijft V1.99 zonder expliciete toestemming voor V2.0.

Gebruiker bevestigt Openbaar en Supabase-opslag; geen Drive-opslag voor deze
functie. Scope bijgewerkt: aparte Supabase-tabel/RPC en aparte publieke pagina
met PIN, huidige account/MFA blijft voor aanmaak en status. Geen Apps Script-
wijziging nodig; bestaande openbare concertcatalogus valideert Gashouder.

Getest met echte PostgreSQL17 en Chromium, volledige bestaande Node-controles,
build en relevante bestaande browserflows. Installatie en technische grenzen:
docs/showbeheer.md. Productie-DDL ontbreekt: eigenaar moet de klaargezette,
herhaalbaar geteste migratie uitvoeren. Geen geheime SQL-uitvoerroute toegevoegd.
