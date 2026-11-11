# Diagnose lege onderzoeksimport

Eigenaar Codex, branch task/dataverse-pilot-open-fix-20261111.
De testshow opent, maar de gefilterde query geeft geen zichtbare rijen.
Ook na rolwijziging geen resultaat. Voeg aan de bestaande beschermde beheerproef
een expliciete alleen-lezen diagnose toe: vaste omgeving/tabel, maximaal50
bronmetadata-rijen, alleen aantallen en vergelijkingsvlaggen teruggeven.
Geen inhoud, record-ID's, bronwaarden, providerfouten of tokens in logs/respons.
Geen automatische writes of verdere rolwijzigingen.
