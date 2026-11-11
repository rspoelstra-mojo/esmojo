# Handmatige onderzoeksimport en websiteproef

De werkende Power Automate-flow wordt handmatig gestart. SharePoint-connector
gebruikt de Microsoft-gebruikersverbinding; ESMOJO heeft geen Graph-rechten nodig.
Bestanden: General/NIEUWE_SHOW_RESULTAAT/<show-sleutel>/*.md. Elf afzonderlijke
vragen, niet de aparte SHOWPROFIELEN_RESULTAAT-werkstroom.

Dataverse-tabel: esmojo_onderzoeksresultaat. Kolommen: esmojo_showsleutel,
esmojo_vraagnummer, esmojo_markdowninhoud, esmojo_bronbibliotheekid,
esmojo_bronbestanditemnummer, esmojo_bronversie, esmojo_bronbestandpad. De unieke
sleutel is bibliotheek-id + itemnummer + bronversie. Titel blijft de primaire
naamkolom; technische EntitySetName wordt bij lezen automatisch ontdekt.

De gebruiker heeft elf leesbare resultaten geïmporteerd en opnieuw uitvoeren
getest zonder extra rijen. Detectie van een gewijzigde bestandsversie is nog
afzonderlijk live te testen. De importflow verwerkt nu één geselecteerde showmap;
vraagnummerextractie volgt haar bestaande bestandsnaampatroon.

Websiteproef: /shows/Hatsune-Miku_AFAS-Live_15112026?tab=showprofiel.
Toegang vereist de gewone account-, MFA- en Shows-controle. De show is de enige
AFAS-uitzondering. Eerste expliciete opening maakt de gewone showstructuur aan;
onderzoekstekst wordt niet naar Drive gekopieerd. Bestaande analyses/beoordelingen
blijven behouden. Showbeheer blijft uitsluitend voor Gashouder.

Alle elf vragen worden met één gefilterde Dataverse-query geladen, parallel aan
de bestaande showbundel; paginering wordt ondersteund tot500 historische rijen.
Token/schema alleen in tijdelijk servergeheugen. Geen persistente inhoudscache.
De bestaande browser-showcontext kan15min bewaard blijven: vernieuw de pagina om
net geïmporteerde versies direct te zien. Bronversies worden numeriek vergeleken
binnen hetzelfde bronbestand; meerdere bestanden voor één vraag geven een fout.
AI-concepten krijgen bronversie/importdatum, geen verzonnen onderzoeksdatum.
Automatisch afleiden van beoordelingen of artiestenrisicoscores gebeurt niet.

Server gebruikt de bestaande vier DATAVERSE_TEST_*-variabelen. De S2S-app moet
de nieuwe onderzoekstabel en metadata mogen lezen. Een werkende Power Automate-
gebruikersverbinding bewijst deze S2S-rechten niet. Fouten blijven zichtbaar per
onderwerp; geen stille terugval op oude AI-inhoud. Providerdetails worden niet
gelogd of naar de browser gestuurd.

Geen automatische SharePoint-import, geen migratie en geen overschrijving van
bronbestanden. Vertrouwelijke showprofiel-PDF's behouden voor deze proef hun
bestaande opslagroute; toekomstige SharePoint-migratie is een afzonderlijke stap.
