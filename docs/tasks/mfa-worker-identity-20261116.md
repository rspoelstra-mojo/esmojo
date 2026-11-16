# MFA-herstel: vaste main-publicatieronde herkennen

Eigenaar account B. Branch task/mfa-worker-identity-20261116 vanaf actuele main.
PR200 publicatie geslaagd, herstelworker faalt403 vóór taakuitvoering: bestaande GitHub-identityallowlist stond alleen schedule/workflow_dispatch toe voor background-tasks.yml. Sta push uitsluitend toe voor exact die bestaande workflow, vaste achtergrondendpoint, repo en refs/heads/main; alle JWT/JWKS/issuer/subject/audience/taakrechten/absolute grantexpiry blijven gelden. Geen loginbypass of nieuwe vrije operatie. Voeg regressietest voor geweigerde anderebranch/audience/workflow toe en veilige foutcode voor workerdiagnose. Publicatie start dezelfde bounded recovery opnieuw.
