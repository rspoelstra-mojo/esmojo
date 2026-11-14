# Reports-eindvalidatie zelfstandig starten

Eigenaar: huidige Codex-sessie; branch task/reports-validation-trigger-20261114.
Vervolg op PR #172, actuele main 528ad3456a5e075f62ec8550d07c460f89b6f043.
De gebruiker autoriseert zelfstandig bouwen, publiceren, valideren en activeren.
Beperkte push-trigger voor alleen de eigen reports-validation.yml op main, met
vaste workflow/audience en oorspronkelijke complete Reports-migratiedelegatie.
Geen handmatige workflow_dispatch nodig, geen nieuwe identiteit/geheim/rechten of
machtigingsverlenging. Uitsluitend read-only bedrijfsvalidatie; geen activering.
Scope: workflow, eigen OIDC-eventtest en bijbehorende documentatie.
