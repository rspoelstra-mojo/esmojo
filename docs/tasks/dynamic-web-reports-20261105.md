# Dynamische CSV-webrapportages

Eigenaar Codex; branch task/dynamic-web-reports-20261105. De bestaande private
OnTrack-map is bron voor automatische webrapportages, gegroepeerd per echte
artiest, submenu Afgelopen week/periode en per concertdatum een eigen dataset/tab.
Behoud Jungle-weergave, berekeningen, alle acht filters, datumlabels, prioriteiten,
MOJO-foto en bewaard showdag-tijdschema. Maximaal vijf nieuwste datumtabs volgens
bestaande afspraak. Onbekende/ambigue CSV-concertkoppelingen niet raden. Canoniek
concert-ID in URL; geen private bestands-ID/URL als browserinput.

Geen wijziging aan PDF-/mailworkflow, triggers, ontvangers, afleverstatus of
bestaand register. Nieuwe webinventaris geïsoleerd en Vertrouwelijk in dezelfde
reeds toegestane Drive-map; verwerking via bestaande Vercel/Drive-route. Alle
Rapportages-module-, MFA- en actuele Drive-controles behouden. Geen echte CSV of
incidenttekst in Git/CI/logs/persistente browseropslag. Scope webinventaris/backend,
reportmenu/router/renderer, synthetische tests/docs en veilige publicatie.


Implementatie: eigen validatie-index en worker, vijfminutencontrole plus check bij
openen, minimaal menu in tijdelijk profielgebonden geheugen, per datum een luie
beveiligde CSV-read. De bestaande werkelijke Jungle-koppeling is uit Drive geverifieerd
(bronhash/metadata); bestandslabel 2 november is niet als showdatum overgenomen.
SCOOTER heeft geen bestaande catalogus-/concertkoppeling. Gebruiker heeft de
historische bestandsnaamfallback bevestigd, met CSV-datumcontrole en mooie
zaalnamen. Dit blijft uitsluitend webmetadata en voegt geen mail-/Shows-concert toe.
Geen PDF-/mail- of bronmutaties door webverwerking. V1.41.

De bestaande echte MOJO-Scooter-pagina is gelezen: H1, 25 oktober 2026 en
Ziggo Dome/Amsterdam bevestigen de fotobron. Alleen zulke overeenkomende publieke
metadata wordt bij historische fallback opgeslagen; geen tijdschema achteraf
verzinnen. Achtergrondverrijking vertraagt de interactieve menuvalidatie niet.


Gecontroleerd: echte beide CSV's lokaal via de nieuwe signed Drive-simulatie;
Jungle-bronhash/handmatige koppeling en bestaande cijfers behouden. SCOOTER nu
via bevestigde historische fallback met correcte datum, 34 volledige incidenten,
mooie zaalnaam en passende officiële MOJO-foto. Mailregister en publieke
concertcatalogi blijven ongewijzigd; geen PDF of echte mail in deze controles.

Browser: dynamisch submenu, drie en daarna vier eigen showdagen, juiste
per-datum CSV/zaal/tijdschema, luie reads/caching, omgekeerde responsvolgorde en
verlaten pagina, nieuwe artiest/tab zonder refresh, acht KPI-filters, compacte
header/afbeelding, bestaande echte Jungle-cijfers en zes kaarten in licht/donker
op 700,900,1280,1440,1920,2560px; geen overflow/HTML-injectie.
