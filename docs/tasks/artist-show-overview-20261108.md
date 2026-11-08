# Historisch showoverzicht in Artiesten

Eigenaar: huidige Codex-sessie op verzoek van de gebruiker.
Branch: task/artist-show-overview-20261108.

Historische concertdatums openen zes kaarten in de artiestpagina. Alleen cijfers
uit de exact gekoppelde showrapportage, zonder filters/incidentteksten; tijdschema
en algemene gegevens uit bestaande bronnen. Vandaag/toekomst niet selecteerbaar.

Scope: artiest-UI, API/service en signed Drive-read met actuele Artiestenrechten.
Vertrouwelijke rapportagetotalen worden uitsluitend in Vercel verwerkt en tijdelijk
in de browser getoond; geen nieuwe opslag. De volledige rapportage behoudt haar
eigen Rapportages/MFA-controle. Geen writes, mails, PDF-generatie of nieuwe diensten.

GitHub-API is geblokkeerd; deze taakbranch dient als gedeelde registratie.
