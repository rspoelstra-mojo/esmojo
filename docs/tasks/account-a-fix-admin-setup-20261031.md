# Eerste-beheerderstap herstellen

Eigenaar: account A. Vervolg op backendrelease PR #4.
De gebruiker krijgt een generieke fout bij de eerste profielkoppeling.

Nieuw JSON-register via de Blob-overload van Drive aanmaken. Specifieke, veilige
foutcodes onderscheiden maptoegang, lezen, schrijven, register en profielvelden.
Geen raw Google-foutdetails, persoonsgegevens of secrets in logs/responses.
Tests dekken nu ook de eerste bestandscreatie (eerder alleen bestaand register),
een falende eerste schrijfoperatie en een ongeldig profiel.

Live oorzaak blijft onbevestigd totdat de eigenaar de instelstap opnieuw uitvoert.
De website-login wordt met deze reparatie niet geactiveerd.
