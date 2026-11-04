# Moduletoegang per account

Eigenaar Codex, branch task/account-modules-20261104. Gebruiker wil Shows,
Artiesten en Rapportages per account aan-/uitzetten bij aanmaken en bewerken.
Expliciet bevestigd: Vertrouwelijk in het bestaande Drive-accountprofiel.
Bestaande profielen zonder moduleveld behouden alle huidige modules; expliciet
lege selectie is toegestaan. Beheerder/accountinstellingen blijven aan bestaande
rolbeveiliging gekoppeld. Geen zelftoekenning via foto-/accountinstellingen.

Scope: gedeelde moduledefinities/validator, accountformulieren, Drive-accounts,
Vercel-toegangscontrole, navigatie en geheugencaches, passende autorisatietests,
projectafspraken en V1.30. Geen moduledata in Supabase/Auth/JWT of publieke opslag.
Bestaande service-/onderzoek-/cronintegraties behouden hun afzonderlijke beveiliging.
Publicatie via normale CI/main/Apps Script-workflow. Geen echte mails versturen.
