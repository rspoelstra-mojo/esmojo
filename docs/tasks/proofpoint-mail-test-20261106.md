# Eenmalige Proofpoint-bezorgproef

Eigenaar Codex; gebruiker heeft drie gerichte testmails naar het eigen zakelijke
adres expliciet geautoriseerd. De bestaande Resend-sleutel blijft uitsluitend in
de bestaande serveromgeving. Alleen een handmatige eigen main/OIDC-workflow mag
de vaste batch sturen; geen vrije ontvanger, inhoud of afzender. Drie varianten:
platte tekst, platte tekst met bestaande rapportagelink, bestaande HTML-opmaak.
Vaste batch-idempotentie en sluiting aan einde van 6 november Nederlandse tijd.
Geen wijziging van bestaande rapportagetriggers of ontvangers. Geen privé-inhoud,
ontvangers of sleutels in logs. Tests mocken Resend en sturen nooit echte mail.
Na livegang uitsluitend de geautoriseerde batch uitvoeren, providerstatussen
controleren indien de bestaande sleutel leesrechten biedt, en de gekoppelde
ontvangende mailbox controleren. Scope tijdelijke API/service, main-workflow en
OIDC-regressies; geen nieuwe sleutel, account of browseropslag.
