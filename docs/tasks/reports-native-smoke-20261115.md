# Native Reports-nacontrole

Eigenaar huidige Codex-sessie; branch task/reports-native-smoke-20261115 vanaf
actuele main 90ef01b. Run 43692823668 heeft de authority én Google-writerfence
omgezet naar Dataverse; stopte daarna in read-only smoke, met 221/8517/226 uit het
originele bewijs. De lange stop/eindcontrole is op gebruikersinstructie overgeslagen.

Scope: private native File-metadata expliciet selecteren waar Dataverse dat vraagt,
gesloten smoke-/read-diagnose en uitsluitend read-only hervatting van de nacontrole
bij dezelfde reeds actieve authority/epoch/actor/eindtijd. Geen heractivering,
rollback, zakelijke reparatie, mails, nieuwe machtiging of schemawijziging.
Registratie vóór implementatie. Native autoriteit blijft actief.

Gebouwd: expliciete select van File plus getypeerde Document-metadata bij key/ID-
reads; een wire-regressie laat File weg bij gewone reads en bewijst de private
select/download zonder writes. Read-only smoke mag uitsluitend dezelfde actieve
authority en Google-epoch hervatten met onafhankelijke proofcontrole en originele
eindtijd. Geen heractivering. Gesloten codes voor oudste/nieuwste/Artiesten en
File-metadatastappen bevatten geen gegevens. Protocol 4, website V1.121.
