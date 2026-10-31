# Accountopslag en eerste beheerder voorbereiden

Eigenaar: account A. Backenddeel van PR #3, apart uitgerold om de eerste
beheerder te koppelen voordat de verplichte login wordt geactiveerd.
Raakt alleen Apps Script-accountopslag, een helper voor de bevoegde scripteditor
en bijbehorende serveradapter/tests. Website-interface blijft ongewijzigd.

De gebruiker heeft profielgegevens als vertrouwelijk geclassificeerd; opslag in
Drive. Supabase Auth mag e-mailadres, wachtwoordbeveiliging en TOTP beheren.
Resend mag e-mailadres en activatielink verwerken voor uitnodigingen.

De editorhelper leest tijdelijke profielinstellingen uit Script Properties,
weigert een bestaand register te overschrijven en verwijdert de tijdelijke
instelling na succes. Geen publieke bootstraproute of persoonsgegevens in Git.
