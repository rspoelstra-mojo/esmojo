# Gedeelde ESMOJO-emailstandaard

Eigenaar: Codex, deze chat. Branch: task/email-standard-20261103.

Gebruik het aangeleverde template.html als vormgevingsbron, met witte transparante
logo-export, blauwe header #0046F2, tabelopmaak/inline CSS, witte inhoud, optionele
grijze informatieblokken, afgeronde blauwe linkknop zonder gekleurde tabelcel en
footer uitsluitend Event Safety Mobility Operations. Geen voorbeeldinhoud meenemen.

Eén centrale serverrenderer voor HTML/plain text en gevalideerde context/links.
Showcontext gebruikt gekoppelde naam/locatie en alle relevante Nederlandse datums.
Accountcontext is door de gebruiker bevestigd als: Account activeren.
Aanhef gebruikt de afzonderlijke voornaam van de ontvanger, nooit de beheerder of
uit een e-mailadres afgeleide namen; gedeelde/groepsontvangers krijgen Beste collega.
De gebruiker heeft hiermee expliciet de voornaam in deze Resend-mails toegestaan;
overig profiel en bestaande Drive-opslag blijven ongewijzigd en Vertrouwelijk.

Werk uitsluitend de bestaande accountmail (aanmaken/opnieuw uitnodigen) bij,
zonder nieuwe triggers, links/TTL/auth/afzender/reply-to te veranderen. Geen echte
mails versturen. Alleen offline preview en bestaande mock-verzendtests.

Verwachte bestanden: centraal emailtemplate/renderer, accountmailbuilder, bestaande
verzendmodule/accounts-handler, tests/CI, logo-export, previewtool, documentatie en
websiteversie V1.18. Livegang volgens bestaande doorlopende toestemming.

Uitwerking: centrale gestructureerde renderer en één bestaande accountbuilder,
serverzijdige tekst-/linkvalidatie en HTML/plain-textversies. De oorspronkelijke
transparante logoasset blijft intact; een witte proportionele PNG wordt bij de
build geëxporteerd. De bestaande persoonlijke voornaam is expliciet toegestaan.
Tests gebruiken uitsluitend fixtures en een gemockte Resend-transportfunctie.
Preview/Chrome-controle draait in de bestaande CI; er is geen publiek mailendpoint.
