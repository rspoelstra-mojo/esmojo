# Unieke accountscope en veilige taakdiagnostiek
Eigenaar huidige Codex-sessie, vervolg op PR156. Bestaande Integratiestatus heeft
naast Sleutel ook de unieke combinatie Integratiecode/Scopecode. Accountrecords
moeten hun eigen account-ID als scope krijgen. Bestaande voorbereide eerste rij
via CAS op dezelfde identiteit corrigeren; geen profiel-/concertgegevens wijzigen.
Vaste read-only statusworkflow mag buiten de muterende globale workflowgroep
alleen de bestaande statusactie uitvoeren. Tests bewaken beide unieke sleutels,
voortgang, huidige autorisatie en geen wijzigingen door diagnose. Oorspronkelijke
48u en leases blijven behouden. Geen nieuwe metadata of bronrechten nodig.
