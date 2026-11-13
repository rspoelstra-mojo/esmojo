# Actuele accountstatus en modulerechten voor snelle Shows-opening

Eigenaar huidige Codex-sessie. Branch task/shows-performance-verification-20261113.
Vervolg op PR155. Productiecontrole van33 voorbereide volledige native Shows-reads:
mediaan2613ms, p95 totaal3394ms; Drive-autorisatie p952916ms versus native opening
p95844ms. De eerder beoogde1s is daarmee nog niet bereikt.

Gebruiker autoriseert nu uitsluitend accountstatus en modulerechten als actuele
Dataverse-bron. Rollen/profiel blijven Drive; login/TOTP/MFA blijven behouden.
Bestaande Vertrouwelijke Integratiestatus/Opdracht worden hergebruikt; geen nieuwe
metadata nodig. Fluid beheerkaart met bewuste éénknopsstart, controle en duurzame
voortgang. Geregistreerde adapter met accountschrijfstop, elf minuten uitlopen van
oude verzoeken, exacte bron/doelvergelijking en bronprotocolblokkade. Eén actuele
native query per rechtencontrole, geen TTL- of browsercache. Onzekere writes
houden het doelaccount achter een fence tot exacte adminhercontrole na15min.
Oude accountvelden zijn compatibiliteitskopieën, geen terugval na activering.

De vaste main/OIDC-workflow gebruikt uitsluitend de oorspronkelijke nog geldige
48u-machtiging en dezelfde taakengine. Geen concertwijzigingen, extra module- of
profielmigratie, mails of geheime/inhoudelijke logs. Verwachte bestanden:
accountadapter, Accounts.gs, achtergrondtaak, beheerkaart, tests/documentatie.

De browserklikmeting omvat ook de eerste contextaanvraag voor onbekende directe
URLs. Alle vijf tabbladen blijven voorbereid. Lokale browsertest met400ms transport
en120ms foto toont412–458ms inhoud en421–558ms foto; dat is gecontroleerd testverkeer,
geen echte ingelogde productiemeting. Nieuwe native productiemeting volgt na beide
bevestigde deployments en succesvolle activering. Geen algemene1s-claim zonder
passend browserbewijs. Werkwijze: docs/dataverse/account-access.md.
