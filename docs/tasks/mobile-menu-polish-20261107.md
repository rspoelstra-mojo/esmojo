# Mobiel: stabiele schermvullende menukop en rapportagedatumtabs

Eigenaar Codex; vervolg op mobiele navigatie V1.64. Gebruiker meldt dat snel
achtereen klikken soms de menukop/logo/sluitknop laat verdwijnen. Onderzoek
scroll/focus van de native dialoog en sectiekeuze; houd de kop buiten de enige
scrollbare menulijst. Maak de mobiele dialoog volledig viewportbreed, zonder
zichtbare rechterstrook. Rapportages op mobiel: titel, foto, dan datumtabs,
zoals bij Shows. Desktop, data, autorisatie en opslaggedrag blijven gelijk.

Scope mobile-navigation.js/.css, lifecycle-/browserregressies en versie V1.65.
Controleer snelle sectiewissels, lang submenu, focus/zoeken, heropenen, touch,
portrait/landscape, foto met/zonder datums en ongewijzigde desktop.

Reproductie bevestigd: scrollIntoView na sectiekeuze schoof de buitenste native
dialoog 101px omhoog; kop stond op y=-101. Met expliciete inner-scroll blijft
dialoogscroll 0 en kop y=0 bij dezelfde twaalf wissels. Het logo is bovendien
verplaatst naar de echte kop, en navigatie-epochs negeren oude microtasks na
sluiten/heropenen. Dialoog is 100vw met clip; lijst houdt de eigen scrollruimte.
Datumtabs gebruiken rij 3 na de foto in rij 2, uitsluitend bij mobiele fotoheaders.
