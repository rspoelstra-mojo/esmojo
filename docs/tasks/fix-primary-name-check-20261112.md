# Herstel primaire naamkolomsetup
Eigenaar Codex; branch task/fix-primary-name-check-20261112.
Gebruiker meldt herhaalde COLUMN_REQUIRED bij Artiest; screenshots bevestigen
esmojo_naam als Optioneel/850 in plaats van overeengekomen Bedrijfsvereist/200.

Herkenbare primaire standaard corrigeren, uitsluitend op een lege onbeheerde
organisatie-eigendom-tabel uit de nieuwe schema-allowlist. Leegtecheck op de echte
EntitySetName, maximaal één primaire ID. Geen recordinhoud naar browser/log.
Haal actuele volledige String-kolommetadata op en behoud overige instellingen en
labels. Alleen RequiredLevel.Value en MaxLength wijzigen via PUT/MergeLabels,
gericht publiceren en met Consistency: Strong teruglezen. Geen andere automatische
metadatareparaties, bestaande onderzoekstabel of gevulde tabellen wijzigen.

Regressies: exacte optional/850-case, alle29 nieuwe tabellen, idempotentie,
behoud overige labels/instellingen, stop bij bestaande records, strong reads,
strikte gewone kolommen en veilige diagnose van verwachte/werkelijke verplichting.
Native systeemvereist mag ook voldoen voor de echte primaire naamkolom.
91 gerelateerde servertests, Chromium, build en browserheaders geslaagd.
Geen live wijzigingen vanuit de ontwikkelsessie; uitvoeren via beheerknop.
