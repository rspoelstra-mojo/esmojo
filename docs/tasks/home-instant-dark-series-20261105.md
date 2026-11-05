# Homepage: snel, donker thema en gecombineerde reeksen

Eigenaar Codex; branch task/home-instant-dark-series-20261105. Gebruiker vraagt
beide thema's, één kaart per echte reeks, maximaal vijf komende / zes eigen
reeksen, reeds gepasseerde shows en afgeronde taken uit deadline-lijst (historie
in kalender behouden). Openbare deadlines/afrondvlaggen zijn expliciet Openbaar;
Supabase toegestaan maar niet verplicht. Accountrelaties blijven Vertrouwelijk
in Drive. Onderzoek materiaalprojectie + sessie-opstart om N dure statusreads
bij iedere navigatie te vermijden, statusupdates na bronwijzigingen en daggrens.
Browseropslag van alleen openbare gegevens ter afstemming gevraagd; nog geen
persistente browseropslag implementeren tot antwoord. Geen nieuwe bedrijfsregels
voor nog niet gebouwde afrondingen. Bestaande module-/MFA-checks behouden.
Scope homepage renderer/CSS, planning, minimale Drive-projectie en veilige
opstart/update-flow, tests/docs/workflows; geen PDF-layout-/mailwijzigingen.


Gebruiker heeft openbare browsercache expliciet toegestaan. Daarna gevraagd de
oude status altijd te laten staan tot een nieuwe geverifieerd is; geïmplementeerd
ook bij tijdelijke fouten, zonder zichtbaar laden. Gekozen voor bestaande Drive +
CacheService-projectie met uitsluitend vier openbare vlaggen, geen Supabase nodig.
Persoonlijke koppelingen uitsluitend Drive/in sessiegeheugen. Same-call bootstrap
bij session/restore, write-through na bronwijziging, PDF-statusbevestiging en
opruimen bij account-/rol-/modulewissel. Kalender behoudt historische/afgeronde
mijlpalen; lists vijf/zes canonieke reeksen; exacte Nederlandse middernacht.

V1.40. Relevante parser/projectie/cache/authorization/source/PDF-/productietests en
build gecontroleerd. Echte Drive-catalogus en echte bestaande bronstatussen lokaal
geprojecteerd: homepage-read opent nul onderliggende bron-/PDF-bestanden. Browser
licht/donker op 320,700,900,1100,1280,1440,1920,2560px; groepen/directe links,
fotoverhoudingen/uitlijning, zes eigen reeksen, kalendernavigatie en refreshbehoud,
geen overflow. Cache-mount gemeten op 15.9ms in Chromium, nul verzoeken vóór paint,
beveiligde sessie is hierbij al gecontroleerd. Dit is geen netwerk-/inloggarantie.

De middagworker haalt ook echte MOJO-foto-URL's vooraf op en bewaart uitsluitend
die publieke URLs; bootstrap hoeft daardoor per foto niet eerst opnieuw een
beveiligde Drive-indexread en scrape te doen. Alleen exact canonical/source-bound
MOJO-media, geen afbeeldingsbytes of tijdelijke afbeeldingen.
