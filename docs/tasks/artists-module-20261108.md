# Artiestenmodule: volledige catalogus en meest bekeken

Eigenaar: Codex. Branch: task/artists-module-20261108.
Bouw een direct doorzoekbaar submenu met Meest bekeken (5, echte openkliks in
het laatste 31-daagse venster) en Alle artiesten uit alle concert-/rapportage-
catalogi. Geen geselecteerde artiest: gecentreerd Kies eerst een artiest.
Artiestpagina voorlopig alleen naam; verdere inhoud volgt apart.

Gebruiker geeft expliciet toestemming voor anonieme klikregistraties (artiest-ID,
tijdstip, willekeurig gebeurtenis-ID) als Vertrouwelijk via Vercel/Redis, 31 dagen.
Geen accountnamen, IP's of zoektermen. Eén gezamenlijke top 5. Alleen openbare
artiestnamen en ID's mogen persistent in browsercache; top 5/inhoud blijven in
sessiegeheugen. Server controleert MFA, actieve account- en Artiestenrechten.

Scope: gedeelde artiestcatalogus, nieuwe beveiligde Drive-metadata-operatie,
Redis-teller, accounts-route, frontend/cache/router, passende tests, Apps Script-
publicatie en websiteversie. Bestaande shows/rapportages/toegang behouden.

Publicatie in twee stappen: deze eerste PR levert de beveiligde, alleen-lezen
Drive-metadata-operatie en gedeelde catalogusvalidatie. Eerst de bestaande Apps
Script-publicatie bevestigen; daarna volgt de frontend/Redis/API in een tweede PR.
Zo krijgt de bestaande website geen tijdelijke afhankelijkheid van een nog niet
gepubliceerde Drive-operatie. Toegang wordt vóór cache-/catalogusreads gecontroleerd.
