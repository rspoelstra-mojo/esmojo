# Veilige diagnose/validatie live OnTrack-snapshot

Eigenaar Codex. Eerste imports bevestigen alle bronnen maar Drive weigert de
snapshotvalidatie. Voeg pure servervalidatie met beperkte vaste foutcodes per
validatieregel toe, zodat geen broninhoud of persoonsgegevens nodig zijn voor
diagnose. Bestaande inventaris behouden. Hoort bij de nog lopende eerste import.
Websiteversie V1.23; automatische rapportage wordt op eigen branch gebouwd.

De aanvullende parser kan officiële MOJO-comedy-/festivalpagina’s tegenkomen;
de oude concerten-only URL-regel was daarvoor te beperkt. De OnTrack-opslag
accepteert uitsluitend dezelfde vaste HTTPS-MOJO-host, inclusief deze officiële
paden. De gewone Gashouder-opslag blijft ongewijzigd. Pure servervalidatie biedt
vaste codes voor venster/dekking/artiest/locatie/datum/bron/ID vóór een write.
Zes inventaris/isolatietests, inclusief externe-hostblokkade, geslaagd.
