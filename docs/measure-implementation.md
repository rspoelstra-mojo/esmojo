# Beheersmaatregel implementeren

Een detailpagina hergebruikt het risicotitel-/beoordelingsontwerp. Operationele
definities komen uit de actuele opgeslagen risicoanalyse. Voor productieonderdelen
zonder opgeslagen definitie vermeldt de pagina dat die ontbreekt. De voorgestelde
maatregel is bewerkbaar; de oorspronkelijke risicoklasse blijft behouden. Suggesties
zijn algemene procesaandachtspunten. Document uploaden staat als afzonderlijke kaart naast de voorgestelde maatregel.
Beide kaarten hebben gelijke hoogte, ook bij bewerken of toegevoegde documenten.
Suggesties bevatten uitsluitend de drie informatieve kaarten.

`shared/measure-workflow.js` bepaalt actuele maatregelen, bronbinding, strikte
requestcontracten en geldige implementatie. `MeasureValidators.gs` is dezelfde bron
zonder ES-module import/export; tests bewaken gelijkheid. `MeasureImplementations.gs`
verwerkt acties via bestaande signed Shows-route, UserLock, nonce, actuele Drive-
profielcontrole, canonieke parent, revisies, historie en readback. Node valideert
opnieuw, inclusief uploadhash/type. De browser mag geen actor/Drive-ID kiezen.

`productionele-risicos.json` bewaart `measureImplementations` en de private upload-
ledger `measureUploads`. Scores na implementatie, briefing en voltooiing staan
apart van oorspronkelijke beoordelingen. Bronbinding omvat actuele PDF-risico-ID,
oorspronkelijke klasse en maatregeltekst. Een gewijzigde bron, maatregeltekst of
bijlage vereist een nieuwe beoordeling/afronding. De historie blijft bewaard.
Een gewijzigde briefingkeuze heropent de implementatie niet.

Alleen expliciet afronden met een geldige klasse én gekozen Ja/Nee voor briefing
zet Geïmplementeerd. Beide keuzes beginnen onbeantwoord. Tot dat
moment: Nog te implementeren. Heropenen is mogelijk. Planning rondt pas af als
alle huidige maatregelen zijn geïmplementeerd en alle oorspronkelijke risico's
geldig beoordeeld zijn. De maatregelenvrije afrondregel blijft intact.

Bijlagen: PDF/PNG/JPG, maximaal 2 MiB en 20 actieve documenten per maatregel.
Private bestanden krijgen een UUID-naam, gevalideerde MIME/signatuur/hash en een
gecontroleerde canonieke parent. Download gaat via de beveiligde applicatie;
verwijderen ontkoppelt een document maar bewaart het historische private bestand.
Bij canonieke mapverplaatsing gaan uitsluitend geregistreerde bestanden mee.

De gebruiker heeft alle nieuwe inhoud Vertrouwelijk verklaard op 6 november 2026,
met uitsluitend Drive-opslag en bestaande ESMOJO/Vercel-verwerking. Tijdelijke
invoer/wachtrijen blijven in showgeheugen en worden bij afmelden gewist. Geen
inhoud in logs, Supabase, analytics of persistente browseropslag. Openbare planning
bevat uitsluitend de afrondvlag. Geen nieuwe AI-dienst, briefingflow of mailactie.

Tests: `server/measure-implementation.test.js`, aanvullende accounts-API-, show-
context-, maatregelen- en planningtests. Browsercontrole gebruikt synthetische
gegevens via de echte handler en getekende Drive-fixture, zonder productiewrites.


Vanaf V1.53 heeft Meenemen in briefing een eigen kaart met Ja/Nee-radioknoppen.
Beide zijn neutraal grijs; alleen gekozen Ja is groen. Geen automatische Nee.
`briefing` is null zolang onbeantwoord, daarna boolean. `briefingChosen` bewaart
of de nieuwe keuze expliciet is bevestigd; het is geen nieuwe briefingflow.
Oude true is een eerdere bewuste selectie. Oude false zonder bevestigingsveld
was de impliciete uit-stand en geldt als onbeantwoord; leesacties herschrijven
geen historie. Deze onzekere oude keuze telt ook niet mee voor implementatie/
planning. Opslaan van een losse score blijft mogelijk; complete vereist beide
velden op API- én Drive-niveau. De bestaande document- en broncontroles blijven.
