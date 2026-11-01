# Eerste MOJO-import: vaste GitHub-identiteit

Eigenaar account A; branch task/account-a-shows-import-identity-20261101.
De echte eerste import wordt terecht geweigerd omdat deze repository inmiddels
GitHub immutable OIDC subjects gebruikt (namen met vaste eigenaar-/repository-ID).
Pas uitsluitend de verwachte identiteit en bijbehorende tests aan; behoud alle
handtekening-, audience-, main- en workflowchecks. Geen secret- of opslagwijziging.
Controleer daarna de echte import en een tweede run zonder nieuwe mappen.
