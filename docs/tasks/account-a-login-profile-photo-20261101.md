# Inlogontwerp en eigen profielfoto

Eigenaar: account A. Status: inlogkaart en profielbeheer gereed; achtergrondfoto
moet nog door gebruiker worden aangeleverd en wordt daarna toegevoegd.
Scope: login-kaart op basis van aangeleverd voorbeeld met origineel ESMOJO-logo
en bestaande thema's; achtergrondfoto volgt nog van gebruiker. Geen serverfoto
overnemen. Accountinstellingen tonen profielvelden alleen-lezen; gebruiker kan
eigen profielfoto uploaden met verplichte ronde uitsnede en zoom/verschuiving.
Avatar onderin hoofdmenu direct bijwerken. Raakt auth/main, nieuwe profiel- en
fotomodules, beperkte CSS en beveiligde eigen-fotoroute/Drive-operatie.

Foto en profiel zijn al als vertrouwelijk geclassificeerd. Alleen de bevestigde
uitsnede opslaan in de bestaande Drive-opslag. Geen foto's in Git, Supabase,
logs of persistente browseropslag. Rollen en andere velden blijven ongewijzigd.

Controles: build en 49 lokale tests geslaagd. Chromium-flow met fictieve
authenticatie en een synthetische foto: alleen-lezen profiel, ronde uitsnede,
verschuiving, annuleren zonder upload, onmiddellijke avatarupdate, navigatie-
opruiming, mobiel en licht/donker gecontroleerd. Geen echte profielfoto opgeslagen
tijdens tests; de echte Drive-schrijfroute moet door een ingelogde gebruiker
worden bevestigd. Login gebruikt voorlopig de bestaande effen achtergrond.
