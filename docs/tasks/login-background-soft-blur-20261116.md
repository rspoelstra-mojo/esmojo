# Subtiele blur inlogachtergrond

Eigenaar: deze Codex-uitvoering. Branch: task/login-background-soft-blur-20261116.

Op verzoek een instelbare CSS-blur van 0–12 px, standaard 3 px, uitsluitend op de openbare inlogachtergrond, inclusief dezelfde preview. Kleine overscan voorkomt lichte blur-randen. Formulier en logo blijven scherp; originele Dataverse-bestanden en opgeslagen uitsneden blijven intact. Geen nieuwe gegevens of schema.

Scope: gedeelde openbare achtergrondconfig, CSS/preview, instellingeneditor, servervalidatie, gerichte tests en websiteversie. Blur staat in het bestaande JSON-configveld; oudere configuraties/clients blijven compatibel. Build, bestaande login-/beveiligingscontroles en CI; publicatie via GitHub/Vercel.
