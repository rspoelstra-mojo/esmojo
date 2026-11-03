# OnTrack

Afzonderlijke beheerpagina `/beheerder/ontrack`, via de bestaande administrator-
MFA/sessiecontrole. Geen showkoppeling of wijzigingen aan bestaande analyses.

Bron en opslag: de door de gebruiker aangewezen private Drive-map
`1V5lw-IicMW_bkphtjD4HIEejCpsOapps`. Alle gegevens zijn Vertrouwelijk; Vercel mag
verwerken en de bestaande Resend-voorziening mag later de rapporten verzenden.
Opslag uitsluitend in Drive, geen Supabase of persistente browsercache.

## Nu beschikbaar

- CSV-inventaris bij openen en Actuele gegevens laden. Alleen directe bestanden
  met extensie .csv (hoofdletterongevoelig); geen CSV-inhoud lezen.
- Ontvangen telt unieke bestands-ID’s die OnTrack sinds ingebruikname in de map
  heeft gezien, inclusief bestaande bestanden bij eerste inventaris. Geen
  reconstructie van bestanden die vóór die inventaris al waren verwijderd.
- Verwerkt telt unieke sourceId’s met een geregistreerde PDF/omzettijd.
- Laatste vijf gesorteerd op convertedAt; vinkje alleen bij emailStatus sent.
- Bestaande actieve accounts selecteren, met revisiecontrole persistent opslaan.
  Geen ontvangers selecteren betekent geen gekozen ontvangers.
- Bij mislukken blijft de selectie in tijdelijk geheugen; na bewust actuele
  gegevens laden blijft die selectie behouden voor opnieuw opslaan.

## Architectuur

`src/ontrack-admin.js` en eigen CSS vormen de fluid-interface. GET/PATCH
`api/access?action=ontrack` wordt uitsluitend na beheerdercontrole afgehandeld.
`server/ontrack-store.js` gebruikt de bestaande Apps Script-URL/shared secret
met een eigen HMAC-domein ontrack en een korte vervaltijd. Geen vrij Drive-pad of
vrije ontvangeradressen via de API. Read-only previews laten deze route niet toe.

`google-apps-script/OnTrack.gs` controleert de ondertekening én het actuele actieve
beheerderprofiel opnieuw, vergrendelt het eigen register en inventariseert de
vaste map. `_esmojo_ontrack_v1.json` bevat version, revision (ontvangerinstellingen),
recipientIds, sources (id/name/receivedAt), reports en beperkte replaynonces.
Instellingen hebben updatedBy/updatedAt. CSV’s worden op id ontdubbeld; namen
zijn geen unieke sleutel. Bronbestanden worden niet aangepast of verplaatst.

Een toekomstige rapportregistratie gebruikt sourceId, pdfId, name, convertedAt
(ISO), emailStatus (pending/failed/sent). Omgezet en verzonden zijn aparte feiten;
een bestaande willekeurige PDF wordt niet als door OnTrack verwerkt geteld.
De huidige release schrijft geen rapportregistraties en verzendt geen mails.

## Nog aan te sluiten na de rapportageprompt

CSV-parser/inhoudelijke validatie, PDF-generator volgens aangeleverde opmaak,
automatische mapcontrole/worker, versiegebonden verwerking en veilige herpogingen,
PDF-opslag/download, individuele ontvangerverzending en bevestigde verzendstatus.
Inventarisatie start nu bij pagina openen of bewust verversen; er is nog geen
achtergrondworker. De pagina meldt dit expliciet.

De toekomstige mail gebruikt de bestaande centrale emailstandaard en verschijnt
als module automatisch in Beheerder → Email. De niet-showcontext onder de titel
wordt eerst met de gebruiker afgestemd. Nooit een voorbeeldadres, echte token of
zelfbedachte rapportinhoud versturen.
