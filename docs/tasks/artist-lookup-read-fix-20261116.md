# Native lookupkolommen in artiestenleesroute

Eigenaar: deze Codex-uitvoering. Branch: task/artist-lookup-read-fix-20261116.

Productiecontrole PR206 weigerde lookupselecties (_esmojo_..._value) in het interne read-only batchtransport met READ_BATCH_INVALID. De vorige werkende productieversie V1.145 wordt tijdelijk hersteld; gegevens en bronautoriteit blijven Dataverse.

Gerichte correctie van de vaste kolomvalidatie, transportregressie en echte transportvalidatie in artiestenprojectietests. Geen vrije queries, schemawijziging of Auth/MFA-aanpassing. Behoud alle andere veiligheidschecks, test/publiceer en hervat bestaande main/OIDC-voorbereiding en werkelijke metingen.
