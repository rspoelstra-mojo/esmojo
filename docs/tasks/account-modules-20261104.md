# Moduletoegang per account

Eigenaar Codex, branch task/account-modules-20261104. Gebruiker wil Shows,
Artiesten en Rapportages per account aan-/uitzetten bij aanmaken en bewerken.
Expliciet bevestigd: Vertrouwelijk in het bestaande Drive-accountprofiel.
Bestaande profielen zonder moduleveld behouden alle huidige modules; expliciet
lege selectie is toegestaan. Beheerder/accountinstellingen blijven aan bestaande
rolbeveiliging gekoppeld. Geen zelftoekenning via foto-/accountinstellingen.

Scope: gedeelde moduledefinities/validator, accountformulieren, Drive-accounts,
Vercel-toegangscontrole, navigatie en geheugencaches, passende autorisatietests,
projectafspraken en V1.30. Geen moduledata in Supabase/Auth/JWT of publieke opslag.
Bestaande service-/onderzoek-/cronintegraties behouden hun afzonderlijke beveiliging.
Publicatie via normale CI/main/Apps Script-workflow. Geen echte mails versturen.

Aanvullend expliciet gevraagd: het bestaande account redacted@example.invalid krijgt
Super beheerder. Vast aan dat ene serverzijdig opgeslagen account gebonden;
alle huidige/toekomstige modules, alle bestaande beheerdersfuncties, geen rol-
of modulebypass voor andere accounts. De bestaande MFA, activatie en sessiecontrole
blijven intact. Eenmalige roltoekenning in het bestaande Drive-register bij een
ondertekend accountverzoek; geen Auth-metadata of extra mail. Andere beheerders
kunnen dit superaccount niet degraderen/blokkeren. UI toont de rol en vaste toegang.

Nadere instructie: Super beheerder mag niet via de website worden toegewezen.
Geen optie in de rolselectie; bestaande rol alleen-lezen tonen. Website-API
weigert expliciete superrolwaarden; alleen serverzijdig behouden bij eigen
profielbewerking. Drive weigert ook getekende toekenning aan andere accounts.
Uitsluitend de vaste codetoekenning voor Richard promoveert dit account.

Implementatie: gedeelde modules/rolhelpers en equivalente Drive-code; drie vinkjes
bij aanmaken/bewerken. Vercel controleert actuele rechten vóór elke moduleactie;
Drive controleert rapportbeheer, downloaden, catalogus en ontvangers onafhankelijk.
Geen directe bestandslinks. Testcatalogus filtert showrapportage voor uitgesloten
accounts. Intrekken blokkeert nieuwe rapportleveringen; MCP-eigenaars vereisen Shows.
Clientcontrole bij focus/terugkeer/minuut en serverweigering wist ongeoorloofde
showcontexten en werkt menu/pagina bij. Superrol gebruikt dezelfde helpers en
behoudt alle modules, ook toekomstige; het e-mailadres staat alleen serverzijdig.
De gerichte Drive-rolmigratie is idempotent en loopt bij de volgende geauthenticeerde
profielcontrole, zonder nieuwe e-mail of wijziging aan Auth/MFA/activatie.

Validatie geslaagd: 3 moduledefinitietests, 30 account-API-tests, 16 profiel-/Drive-tests,
7 emailtests, 3 OnTrack-tests, 6 catalogustests, 19 rapporttests (5 data/2 PDF/12 service),
19 MCP-tests, 6 Apps Script-tests, 4 publicatietests, 3 aanmeldtests, build en diffcheck.
Autorisatiematrix omvat alle modulecombinaties; bekende rapport-ID na intrekken,
reeds klaargezette mail, injecties, zelftoekenning, foto-omweg, oude profielen,
lege selectie en behoud bij wijzigen. Superroltoekenning via website en aan andere
accounts wordt geweigerd, codepromotie eenmaal, geen gewone beheerder kan degraderen.
MFA en activatie blijven verplicht. Fictieve Chromium-proef met echte formulier- en
navigatiecode: alle 8 combinaties, beide gewone rollen, directe pagina’s, aanmaken,
wijzigen/heropenen en lege selectie; Super ziet alles, rol alleen-lezen en niet in
rolopties. Licht/donker vastgelegd en formulier bekeken. Geen echte mails verzonden.
Geen superaccountadres in publieke frontendbundel. Opslag alleen bestaand Drive-register.
