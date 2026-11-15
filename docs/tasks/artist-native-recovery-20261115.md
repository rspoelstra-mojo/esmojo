# Artiesten laden herstellen — overname account A

Eigenaar huidige Codex-uitvoering, branch task/artist-native-recovery-20261115.
Gebruiker bevestigt dat account A gestopt is en vraagt diens taak af te maken.
Oorspronkelijke registratie PR190 / f65a847 bevat uitsluitend een taaknotitie,
geen gepushte implementatie. Deze opvolger begint vanaf actuele origin/main.
Geen oude branches samenvoegen of oorspronkelijke registratie verwijderen.

Onderzoek en herstel niet ladende artiestpagina's na native migratie. Centrale
Dataverse-catalogus, bestaande profiel/show/rapportageweergave en actuele server-
rechten behouden. Geen Drive-/Supabase-bedrijfsfallback of authbypass, geen echte
mails of fictieve bedrijfsdata. Verwachte artiestenruntime, gerichte tests en
publicatiebewijs. Redis-publicatie PR189 staat live V1.130; native proef 780ms
geslaagd, werkelijke Redis-activering en dienstafsluiting nog niet uitgevoerd.


Oorzaak bewezen: createIncidentMetricsService.snapshot vraagt incident-daily-read;
Shows/Reports router had hiervoor geen native dekking en bereikte de afgesloten
Drive-brug. De frontend wacht bewust op profiel én score en faalde daardoor geheel.
Herstel: vier daily-routes native, versleutelde/compressie-begrensde afgeleide dagstand
in bestaande Integratiestatus, CAS + volledige onafhankelijke readback. Geen schema-
wijziging of andere canonieke bron. Amsterdam-middernacht, oorspronkelijke 4u
voortzetting en eerste dagpublicatie behouden. Geen scan/write bij lezen.
Eerste native dagstand opnieuw opgebouwd uit actuele getypeerde native gegevens;
geen beweerde bytegelijke kopie van oude Drive-dagstand. Origineel blijft bewaard.

Incident-read met artiestscope levert alleen die artiest, zodat native Shows niet
onnodig alle andere voorbereidingen laadt. Rapportageweergave/parser onveranderd.
Bestaande fixed main/OIDC worker initialiseert bij publicatie en controleert menu,
profielen, risicolezing en oude rapportagekoppeling met actuele workerrechten.
Geen vrije actor of gegevensinhoud in probe; geen nieuwe gebruiksessie/Auth-bypass.

Lokale validatie: 97 gerichte Reports/Artiesten/incidenttests en 24 probe/daily/OIDC-
tests geslaagd; Vite-build en bestaande artiest-browsercontroles geslaagd op
390/1440px licht/donker, profiel+score samen, historie/KPI's en races/disposal.
Productie-uitkomst volgt afzonderlijk na merge/deployment.

Brede lokale servercontrole: 723 geslaagd, 0 fouten, 1 conditionele echte Redis-test
niet relevant voor deze wijziging overgeslagen. Build en diffcontrole geslaagd.
