# Opslagbevestiging Special Effects en showlaadtijd

Eigenaar Codex; branch task/show-save-response-20261106.

Herstel de clientgrens tussen technische homepage-opslagmetadata en de strikt
gevalideerde productionele keuze. Test Ja/Nee inclusief vier opeenvolgende Nee's
met echte responsevorm, revisies en hervatten na fouten. Onderzoek en verwijder
onnodige dubbele Drive-reads bij show-open, zonder nieuwe opslag van uitgesloten
gegevens, zwakkere rechtenchecks of wijzigingen aan vormgeving/bediening.

Scope: API-resultaatnormalisatie, showcontext, signed Drive-readpad en gerichte
regressie-/browsercontroles. Eventuele laadtijdoptimalisatie in dezelfde taak of
aansluitend; acute opslagfout heeft prioriteit. Geen schemawijziging of mail.
