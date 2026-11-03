# Automatische OnTrack-showrapportage

Eigenaar: Codex, deze chat. Branch: task/automatic-show-report-20261103.

Gebruiker heeft volledige overdracht ESMOJO_Codex_overdracht_showrapportage.md
als specificatie aangeleverd. Pure strenge CSV-laag (17 headers), exacte KPI’s,
grafiekfilters, chronologisch volledig overzicht, bestaande productiefonts/MOJO-
footer, eigen dynamische PDF-generator, veilige Drive-workflow en rapportmail.
Bestaande showprofielgenerator intact. Bestaande vertrouwelijke classificatie,
Drive-opslag en Vercel/Resend-route zijn expliciet bevestigd.

SCOOTER-CSV is gevonden in de OnTrack-map; uitsluitend lokaal testmateriaal,
geen vertrouwelijke incidentinhoud in Git/CI/logs. Originele Montell-PDF en
gevalideerde productieassets aanwezig. Goedgekeurde SCOOTER-referentie-PDF en
origineel ON-icoon nog niet gevonden; gebruiker gevraagd die toe te voegen.
Geen eigen iconen/logo’s of stilzwijgend vrijgegeven definitieve PDF bij ontbreken.

Verwachte bestanden: nieuwe ontrack rapportmodules/assets/tests, beperkte eigen
Drive/API/admin/worker-koppelingen, docs en versie. Huidige CSV-flow bewaart alleen
metadata; PDF-worker volgt nu pas. Concertkoppeling moet uit echte opgeslagen
showcontext komen; geen voorbeeldnaam/locatie/datum als productieconstant.

Gebouwd: pure CSV-/tijd-/KPI-laag; eigen A4-PDF-master met zes kaarten, vector-
grafieken, volledige incidenten, automatische paginering, originele fonts/footer
ongewijzigd; originele-assetblokkade; signed private Drive-generatie/leases/hash-
commit/versioning/deduplicatie; persoonlijke PDF-mail met provider-idempotentie,
bevestigde afleverstatus en review bij onzekerheid; halfuurworker; beheerkoppeling,
herpoging, private download en bewust mailen na een lege ontvangerselectie.

Regressie: oorspronkelijke showprofielgenerator blijft byte-identiek. Lokale
SCOOTER-acceptatie controleert alle opgegeven KPI’s, types 5/3 met som 12/11,
34 incidenten, 1 rode kaart, alle incidentteksten en 5 A4-pagina’s. CSV/PDF/data
niet in Git/CI/artifacts. Synthetische tests: data (5), PDF (2), signed workflow
(9), accounts-API (27), OIDC (5), bruggrenzen (6) en bestaande OnTrack/deploytests.
Browsermocks: koppelen/conflictbehoud/retry/download/verzendstatus, light/dark,
390/1280/1440/1920/2560px zonder overflow. Geen echte mails verstuurd.

Nog open: originele grijze ON-PNG en goedgekeurde volledige SCOOTER-referentie
ontbreken; expliciet gevraagd. Zonder originele PNG geen definitieve verwerking
of mail; alleen duidelijke lokale onvolledige layoutproef. Volledige visuele
vergelijking met goedgekeurde rapportage kan pas na aanlevering. Bij locatie-
ties voorlopig eerste CSV-voorkomen, toegestaan in de specificatie; gebruiker om
voorkeur gevraagd omdat de voorbeeld-top7 daardoor bij gedeelde plaatsen afwijkt.

Websiteversie V1.24 na de geverifieerde live V1.23-inventarisfix. Aanvullende
MOJO-inventaris is inmiddels succesvol live gevuld met 122 concerten, uitsluitend
voor beheerder-mailings; gewone Shows-index blijft gescheiden.
