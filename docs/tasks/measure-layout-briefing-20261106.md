# Maatregelpagina: documentkaart en expliciete briefingkeuze

Eigenaar Codex, branch task/measure-layout-briefing-20261106. Document uploaden
uit Suggesties, als even hoge kaart naast voorgestelde maatregel. Eigen briefing-
kaart met Ja/Nee zonder standaardselectie; alleen Ja groen. Afronden vereist
zowel na-implementatieklasse als expliciete briefingkeuze, ook serverzijdig en
in planning. Bestaande vertrouwelijke opslagroute, originele scores en documenten
blijven behouden. Scope maatregel-UI/CSS, gedeeld contract/Drive en gerichte tests.

Uitgevoerd: even hoge maatregel-/documentkaarten; aparte radio-briefingkaart.
Draft accepteert null zolang onbeantwoord; complete vereist boolean plus risicoklasse.
Oude impliciete false wordt niet tot bewuste Nee gepromoveerd; oude true blijft.
Revisies, historie, uploads en oorspronkelijke risicoklasse blijven behouden.
Controles: API/Drive-contract, historische gegevens, gedeelde planning, context/
broncontroles, documentupload/download, foutbehoud en herpoging, productiebuild,
Apps Script/Drive/deploytests en browsertest via echte handler/signed Drive-fixture
op 1920/1440/900/700/390px in beide thema's. Geen productie-invoer of mails.
Publicatie PR #99, V1.53; openbare planning na publicatie herberekenen.
