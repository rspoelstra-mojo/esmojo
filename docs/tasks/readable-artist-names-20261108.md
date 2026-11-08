# Leesbare artiestnamen

Eigenaar: Codex. Branch: task/readable-artist-names-20261108.
Wijzig de drie aangewezen artiestlabels naar Yousuke Yukimatsu, U2 en New Wave.
Voeg conservatieve, gedeelde weergaveregels toe voor duidelijke tourtoevoegingen,
decoratieve randen en leesbare naamalternatieven; behoud echte artiesttekens.
Concert-/rapportbrondata blijven intact. Oude artiest-IDs moeten blijven werken,
klikstatistieken van oude en nieuwe varianten worden zonder Redis-migratie samen
geteld. Browsercache blijft uitsluitend openbare namen/IDs bevatten.
Scope: naamnormalisatie, artiestservice/cache/detailweergave, regressies, docs en
websiteversie. Geen nieuwe gegevenssoort of opslagroute.

Aanvullend gebruikersverzoek: leesbare URL's zoals /artiest/u2 en /artiest/newwave.
Slugs worden uit de leesbare naam afgeleid, zonder spaties/diakritische tekens.
Interne IDs blijven behouden voor telling/autorisatie; oude ID-links blijven
werken en worden zonder extra navigatiestap vervangen door de leesbare URL.
Bij echt verschillende namen met dezelfde slug krijgt de route een unieke korte
suffix; nooit willekeurig de verkeerde artiest openen. Slugs/alias-tabellen worden
niet extra persistent in de browser opgeslagen: alleen namen en bestaande IDs.

Aanvullend gebruikersverzoek: geen zichtbare scrollbalk in submenu's. Gedeelde
submenu- en mobiele menu-scrollcontainer verbergen de balk via scrollbar-width
en ::-webkit-scrollbar; overflow en toetsenbord-/wiel-/touchscroll blijven intact.

Validatie: build, diff-check en naam-/route-, service-, cache- en 40 account-APItests
slagen. Browserfixtures op 390/1440px in licht/donker toetsen directe cached namen,
leesbare links, normaliseren oude ID-links zonder extra geschiedenis/klikpunt,
behoud oorspronkelijke retry-ID en UUID, samenvoegen statistiek en opslagwhitelist.
Gedeelde CSS gecontroleerd op verborgen balk én behouden programmatisch/wielscrollen
in beide schermmaten/thema's. Geen echte gebruikerskliks of productiedata aangemaakt.
