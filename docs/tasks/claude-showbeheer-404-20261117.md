# Showbeheer-link geeft 404

Eigenaar: Claude Code. Branch: task/claude-showbeheer-404-20261117-0640.

Probleem: de gegenereerde Showbeheer-URL (https://esmojo.nl/showbeheer/#<geheim>) geeft een Vercel-NOT_FOUND. Op de live deployment geeft /showbeheer en /showbeheer.html wel 200, /showbeheer/ met slash 404: de bestaande rewrite /showbeheer/:path* matcht de slash-URL niet.
Aanpak: expliciete rewrite van /showbeheer/ naar /showbeheer.html in vercel.json, zodat al verstuurde links blijven werken. Geen wijziging aan URL-formaat, PIN, sessie, Dataverse of andere routes.
Verwachte bestanden: vercel.json, deze notitie. Bewijs via previewdeployment van deze branch en daarna live.
