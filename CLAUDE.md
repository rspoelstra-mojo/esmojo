# ESMOJO — Claude Code

Werk in het Nederlands. Dit bestand is de Claude-ingang; de gedeelde afspraken
blijven leidend. Lees de geïmporteerde bestanden vóór uitvoering:

@AGENTS.md
@docs/samenwerken.md
@docs/projectcontext.md

Volg bij historische tegenstrijdigheden het nieuwste expliciete gebruikersbesluit.
Lees voor de taak de actuele code, relevante documentatie en open PR's; de context-
snapshot is geen vervanging voor actuele origin/main. Begin geen oude backlogtaak
zonder opdracht. De gebruiker heeft performanceoptimalisatie na V1.149 gestopt.

Registreer implementatiewerk vóór wijzigingen met een eigen taaknotitie en draft-PR.
Gebruik eigenaar `Claude Code` en bijvoorbeeld `task/claude-<onderwerp>-<datum-tijd>`.
Wijzig niet tegelijk de fysieke checkout van een andere actieve agent. Geen extra
worktrees, force-pushes, resets of verwijderen van andermans werk. Respecteer
onbekende/untracked werkmappen; gebruik die niet als contextbron.

Account A, andere Codex-sessies en Claude delen geen chats, logins of toolrechten.
Verifieer je eigen bestaande zakelijke GitHub-/Vercel-toegang. Vraag geen tokens
in de chat en kopieer geen credentials uit andere sessies. Ontbrekende toegang is
geen reden om beveiliging te omzeilen of een nieuw project/deployment te maken.
Zie docs/claude-code.md voor installatie, startprompt en overdracht.
