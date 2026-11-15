# Oude Google- en Supabase-bedrijfsopslag afsluiten

Accountactivering is bevestigd in run 43726627994: drie accounts en één foto.
Shows, Rapportages en accountprofielen gebruiken Dataverse; Supabase Auth blijft.

## Applicatie en Google-webapp

Productie weigert de oude Google-bruggen voordat credentials, HTTP of bestanden
worden aangeraakt. Shows vereist de bewezen native autoriteit, ook als een oude
providerinstelling nog legacy noemt. Rapportages en accounts weigeren een ontbrekende
native autoriteit. Geen terugval naar Drive of oude Supabase-snapshots.

De bestaande Apps Script-webapp weigert na de bevestigde native accountactivering
alle oude POST-routes met INTEGRATION_RETIRED. De bronfuncties en oorspronkelijke
bestanden blijven bewaard. De bestaande deployment wordt opnieuw gepubliceerd;
geen nieuwe Google-deployment en geen bronverwijdering.

De oude mirror/archive-cron en afzonderlijke status-/Shows-/Reports-cutoverworkflows
worden verwijderd. Hun HTTP-defaults geven 410. Oude taakdefinities zijn in productie
niet meer startbaar of hervatbaar; checkpoints/bewijzen blijven leesbaar en de
worker voert ze niet uit. De algemene worker blijft beschikbaar voor nieuwe bewuste
opdrachten en native accountcontrole. Reguliere mail en MOJO 05:00/12:00 blijven.
De oude bronimportknoppen worden in de echte beheerpagina uitgeschakeld.

GOOGLE_DRIVE_SHARED_SECRET blijft een vereiste domeingescheiden encryptiesleutel
voor bestaande Dataverse-checkpoints, ACL's en instellingen. Niet verwijderen of
roteren zonder afzonderlijke herencryptie. Supabase-keys blijven nodig voor Auth,
MFA en de bestaande versleutelde Showbeheer-credentials. Sleutelbehoud is geen
actieve Google-/Supabase-bedrijfsopslagverbinding. De oude Drive-URL kan onder een
RETIRED_-naam bewaard worden zodat de applicatie die niet meer als configuratie ziet.

## Supabase: rechten op het bewaarde archief

De server weigert in productie ook expliciet geconstrueerde oude Supabase-
businessrepositories voordat een client wordt aangemaakt. Tabellen/rijen blijven
bewaard. Anonieme en ingelogde eindgebruikers hadden daarop al geen directe rechten.

Voor het apart intrekken van oude service_role-rechten is productie-SQL-beheer
nodig. Gebruik uitsluitend:
[supabase/migrations/202611150001_retire_business_storage.sql](../../supabase/migrations/202611150001_retire_business_storage.sql).
Dit script trekt toegang in op precies vier oude bedrijfstabellen en zeven RPC's,
controleert het resultaat vóór commit en is herhaalbaar. Ontbrekende oude objecten
worden overgeslagen. Geen DROP/DELETE, wijziging van Auth-schema, rollenlidmaatschap,
loginaccounts, MFA, sessies of sleutelwaarden. De oude enabled-vlag wordt niet
omgezet: de bestaande guard zou daarvoor gegevensverwijdering vereisen; intrekken
van rechten sluit toegang af met behoud van de originelen.

De lokale PostgreSQL/CI-proef bewijst de blokkade, herhaalbaarheid, behoud van een
bestaande rij en ongewijzigde Auth-rechten. Dat is geen bewijs van productie-uitvoering.
Zonder productie-SQL-verbinding moet de projecteigenaar dit exacte script in de
SQL-editor van het bestaande Supabase-project uitvoeren. Deel geen credentials.
