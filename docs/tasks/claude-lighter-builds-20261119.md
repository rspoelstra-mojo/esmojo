# Lichtere functiebundels

Eigenaar: Claude Code. Branch: task/claude-lighter-builds-20261119. Doel: deployment storage verlagen (functiebundels per deployment).

Meting (lokaal met @vercel/nft over api/*.js, vóór en na): totaal 247,7 MB -> 196,7 MB over 21 functies. De zes uitgeschakelde (410) functies droegen elk ~8,5 MB aan code mee, hoewel ze alleen een 410 teruggeven.

Wijzigingen:
- De volledige oude implementaties van show-storage-sync, account-access-sync, shows-validation-sync, shows-cutover-sync, reports-validation-sync en reports-cutover-sync staan nu in server/retired-handlers/ (alleen voor tests). De api-bestanden zijn dunne stubs die alleen retiredIntegration (410) teruggeven; gedrag voor aanroepers ongewijzigd.
- vercel.json: includeFiles/maxDuration-regels van die zes en van de al dunne functies home-planning-sync en artist-biographies-sync verwijderd.
- vercel.json: excludeFiles `node_modules/@img/*linuxmusl*/**` voor de drie functies met sharp (access, shows-runtime-sync, web-reports-sync); de musl-varianten van libvips zijn op de Vercel-runtime (glibc) niet nodig. Heeft geen effect als die varianten niet geïnstalleerd worden.

Niet veranderd: aantal functies (22), live functiegedrag, secrets, schema.

Mogelijke vervolgstappen (niet gedaan): de zes resterende 8,4 MB-functies lichter maken door PDF-/rapportmodules niet meer te laden waar ze niet nodig zijn; functies samenvoegen via rewrites (relevant voor de limiet van 12 functies op Hobby).
