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
