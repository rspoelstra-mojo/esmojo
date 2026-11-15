# Oude bedrijfsopslag afsluiten

Eigenaar huidige Codex-uitvoering; branch task/retire-legacy-storage-20261115.
Gebruiker bevestigt stap 2: overbodige Google-koppelingen en oude Supabase-
bedrijfsopslag afsluiten, met behoud van originelen en Supabase Auth/MFA/sessies.
Native accountactivering bevestigd: 3 accounts/1 foto, run 43726627994.

Inventariseer runtime, workers en sleutels; sluit oude mirror/archive/import-
startpaden en terugvalroutes af. Geen bestanden, tabellen, Auth-accounts of
ciphertext verwijderen. Sleutels met actieve cryptografische afhankelijkheden
behouden. Bestaande native Rapportages/Shows/concertimport/mail behouden.
Publiceren via bestaande koppelingen en werkelijke uitkomsten verifiëren.

Afsluiting omvat de zes oude bron-/cutoverworkflows en hun HTTP-defaults (410),
productieblokkades vóór Google HTTP of Supabase-businessclients, verplichte native
Shows/Reports/accountautoriteit, en niet-herstartbare oude taken met behoud van
hun checkpoint. De generieke worker en native reguliere mail/05:00/12:00 blijven.

Supabase heeft geen beheerconnector of productie-SQL-verbinding in deze sessie.
Een idempotent statisch SQL-script trekt uitsluitend oude tabel-/RPC-rechten in,
met asserties vóór commit; Auth en gegevens blijven onaangeraakt. Alleen lokale/CI-
uitvoering wordt getest. Productie-uitvoering mag niet als afgerond worden gemeld.
Vercel metadata toont alleen GOOGLE_DRIVE_SCRIPT_URL als verouderde verbinding en
GOOGLE_DRIVE_SHARED_SECRET als nog vereiste cryptografische sleutel. Waarden niet
ontsleuteld of geprint. URL-configuratie kan zonder waardewijziging worden afgezonderd.

Controles: 754 backendtests geslaagd/één bestaande skip; aanvullende worker-/
retirementtests en browser/mobiel geslaagd. De SQL-intrekking is tweemaal getest
in een geïsoleerde PostgreSQL 17-container: oude tabel/RPC-toegang geweigerd,
bestaande rij behouden, Auth-permissies onveranderd. Container daarna verwijderd.
Nieuwe main/OIDC-agendaprobe leest uitsluitend en wacht op protocolversie 3 van
de daadwerkelijk nieuwe deployment. Productie-SQL is nog niet uitgevoerd.
