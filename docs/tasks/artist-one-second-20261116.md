# Artiestenpagina binnen één seconde

Eigenaar: deze Codex-uitvoering. Branch: task/artist-one-second-20261116.

Doel: klik tot bruikbare artiestinformatie plus risicoscore binnen 1000 ms. Bestaande vormgeving, berekeningen en rechten behouden. Rapportages mogen stil op de achtergrond blijven laden na de landing. Onderzoek eerst de actuele native leesketen; geen schijnwinst door ontbrekende score of skeleton.

Scope: artists-page/clientcache, artist-service, native profiel-/risicoleespaden en gerichte performance-/autorisatietests. Indien nodig bestaande beveiligde afgeleide leesprojecties gebruiken; geen nieuw schema, Google/Redis-fallback, zakelijke testwrites of Auth/MFA-wijziging. Productiemetingen via vaste bestaande main/OIDC-route alleen read-only/afgeleid onderhoud, met actuele rechten. Browsermeting en backendmeting apart rapporteren.

Verwachte bestanden: src/artists-page.js, src/lib/artist-catalogue-cache.js, server/artist-service.js, server/incident-metrics.js, server/dataverse-reports/artist*.js, server/artist-runtime-verification.js, bestaande worker/auditroutes, tests en documentatie. work/ behouden.

Gebouwd: artist-open bundelt profiel+score, een geverifieerde versleutelde afgeleide landing met actuele bronsets/ETags, relatiecontrole en CAS/readback; optionele metadata-warmup; gecentraliseerd cacheonderhoud in bestaande OIDC-worker; browserprofiel/foto/score-metingen. Publieke fotovariant, netwerkprioriteit en bestaande stille rapportagelader blijven behouden. Nieuwe bron-/score-inhoud wordt niet geïntroduceerd. Productievoorbereiding en definitieve metingen zijn nog niet uitgevoerd.
