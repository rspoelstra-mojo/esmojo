# MOJO Gashouder-concerten

Eigenaar: account A. Branch: task/account-a-mojo-shows-20261101.

Importeer openbare concertgegevens uit de MOJO-agenda voor de komende 365 dagen,
uitsluitend Gashouder Amsterdam. Hergebruik artiestmappen en maak concertmappen
met artiest_locatie_DDMMYYYY. Bewaar algemene showreeksinformatie bij de eerste
opeenvolgende datum; datumgebonden informatie blijft bij het eigen concert.
Vul alleen het Shows-submenu met unieke artiesten binnen 90 dagen, geen pagina's.

Verwachte scope: scraper/importcode, ondertekende Apps Script Drive-opslag,
Shows-submenu, tests en documentatie. Geen wijzigingen aan Supabase-schema,
accountprofielen of secrets. Concertgegevens zijn expliciet Openbaar verklaard.

Toevoeging gebruiker: dagelijkse controle om 12.00 Nederlandse tijd. Gebruik de
vaste GitHub Actions-workflow met OIDC-authenticatie richting Vercel, bestaande
HMAC-richting Drive en zomer-/wintertijdselectie. Geen nieuwe secrets of Google
OAuth-scopes. GitHub-schedules kunnen enkele minuten vertraging hebben.

Aanvulling: alle artiestmappen en de technische concertindex komen uitsluitend
onder ESMOJO/Productie. Die map wordt hergebruikt of eenmalig aangemaakt.
