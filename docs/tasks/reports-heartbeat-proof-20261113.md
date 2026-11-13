# Rapportages: bedrijfsintegriteit versus operationele heartbeat

Eigenaar Codex account A, task/reports-heartbeat-proof-20261113.
Gebruiker vraagt expliciet de bestaande kopie automatisch te herstellen en geheel
af te maken. Taak43510529132 loopt na catalogusherstel;221 rapportages, verificatie
van eerste dataset actief. OnTrack-standaardworker schrijft elke uitvoering een
nieuwe pipeline.status/updatedAt, ook zonder gewijzigde rapportages. Dit tijdelijke
procesveld zit nu in de globale inventarisvingerafdruk en zou een lange kopie ten
onrechte blokkeren. Bewaar de oorspronkelijke snapshot, maar laat eindcontrole
uitsluitend dit gesloten heartbeat-object uit het versleutelde controlepunt als
baseline gebruiken. Alle zakelijke bron-/context-/mail/registervelden en hashes
blijven exact vergeleken; geen bron-/doelreparatie of nieuwe kopie/verlengen48u.
Valideer de volledige opgeslagen instellingenhash vóór gebruik. Voeg uitsluitend
reeds toegestane technische record-/bestandstellers toe aan OIDC-status, geen IDs,
namen, providerbody of inhoud. Bestaande lopende cursor blijft compatibel.
