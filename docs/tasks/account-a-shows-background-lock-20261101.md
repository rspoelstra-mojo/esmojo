# Achtergrondimport los van accountverkeer

Eigenaar account A; branch task/account-a-shows-background-lock-20261101.
De eerste import duurt langer door de vele Drive-mappen. Gebruik een afzonderlijke
importlock (UserLock, webapp draait altijd als eigenaar) in plaats van de globale
ScriptLock van accountbeheer. Lees de laatst gepubliceerde concertindex zonder
op de import te wachten. Behoud de schrijfserialisatie en idempotentie.
Scope: Shows.gs, shows-store.test.js, technische documentatie. Geen nieuwe scope,
secret, endpoint, opslagbestemming of productfunctionaliteit.
