# Mobiele navigatie en paginavullende inhoud

Eigenaar Codex; gebruiker vraagt uitsluitend op mobiel een klein rond menu-icoon
linksboven, met toegang tot het hele hoofdmenu/submenu. Gesloten menu neemt geen
paginabreedte of lange lijst boven de inhoud in. Fluid-inhoud gebruikt de breedte
en stapelt kaarten voor normaal verticaal scrollen. Desktop blijft gelijk.

Hergebruik bestaande menu-elementen en autorisatie; geen aparte catalogus,
gegevensopslag, nieuwe routes of mutaties. Mobiele dialoog met veilige focus,
Escape/sluiten, scroll-lock en herstel bij viewport-/sessiewissel. Controleer
homepage, rapportage, Shows, detail/formulieren, licht/donker, smalle/grote
telefoons en ongewijzigde desktop. Scope eigen mobiele CSS/controller, main-
integratie, toegankelijk HTML en passende browser-/regressiecontroles. V1.64.

Implementatie: native drawer hergebruikt originele menu's, met compacte
hoofdpaginaknoppen en het huidige submenu, systeemthema en zoekfunctie. Geen
layout-/datacopie. Telefooninhoud heeft 12px zijruimte, gestapelde fluid-kaarten
en intern scrollbare tabs. Een eigen CSS-lock voorkomt conflicten met bestaande
formulierdialogen. Invoer blijft staan bij menu openen/sluiten en resizen.

Gecontroleerd in Chromium op 320/360/390/430/700px, licht en donker: geen
horizontale pagina- of menuoverflow, kaartvolgorde, open/sectiekeuze/paginakeuze,
Escape/focus, scrollherstel, homepage, formulierinvoer en afmelden. Desktop
768/1024/1440/1920px heeft identieke gemeten posities/stijlen; 1440px is ook
pixelgelijk aan de eerdere indeling. VM-regressies lopen in bestaande CI.
