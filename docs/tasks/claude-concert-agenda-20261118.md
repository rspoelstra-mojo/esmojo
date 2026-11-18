# Concertagenda (voorheen Personeelsplanning) met vier tabs

Eigenaar: Claude Code. Branch: task/claude-concert-agenda-20261118. Alleen presentatie in stap 1.

Gebruikersopdracht (18 november 2026):
- Beheerder / Personeelsplanning heet Concertagenda (route /beheerder/concertagenda; de oude route blijft doorverwijzen).
- Tabs: Algemeen, MOJO personeel, Beveiliging, Zaal. De lijst met concerten (artiest, locatie, datum) blijft altijd zichtbaar; de kolommen erachter wisselen per tab:
  MOJO personeel = Productie manager, Event Safety manager, CMT leider MOJO; Beveiliging = Projectleider beveiliging;
  Zaal = Productie manager zaal, Event manager zaal, CMT leider zaal.
- Tab Algemeen: artiestnaam aanpassen (aliassen) en concertreeksen samenvoegen. Vereist ontwerp en classificatie; volgt na afstemming (stap 2).

Stap 1 (nu): hernoemen, tabs en wisselende kolommen. Geen nieuwe opslag, API of rechten. Opslag van namen blijft ongewijzigd (zelfde acties en revisies).

## Stap 2: ontwerp artiestnaam-aliassen en reeksen (afgestemd 18 november 2026)

Besluiten van de gebruiker: gegevens zijn **Openbaar** (correcties op openbare MOJO-agendagegevens); bestaande concerten **mogen worden verplaatst**
(alleen zonder aanhangende showgegevens, anders een melding); een **reeks** = dezelfde zaal, ook met tussendagen.

**Artiestnaam (tab Algemeen)**
- Opslag: bestaande Integratiestatus, rij `artist-alias-v1` per genormaliseerde MOJO-bronnaam → gekozen artiestnaam. Geen nieuw schema. Een alias geldt voor alle
  concerten met die bronnaam; de oorspronkelijke MOJO-naam blijft zichtbaar (klein) naast de gekozen naam. Invoer met suggesties van bestaande artiesten.
- Toepassen op: de Concertagenda zelf, de 05:00-import (naam eerst via de alias, daarna artiestmatch/-aanmaak, zodat nieuwe concerten bij de bestaande artiest
  landen), en de CSV-ontvangst (bestandsnaam-slug via de alias). Bestaande concert-ID's blijven ongewijzigd.
- Bestaande concerten: koppel de reeks aan de gekozen artiest (aanmaken zoals de 05:00-run als die nog niet bestaat) alleen als er geen showprofiel,
  risico's, maatregelen, documenten of rapportage aan hangen; anders melding "staat al in ESMOJO onder [naam] met showgegevens". ETag-changeset + readback.

**Reeksen (tab Algemeen)**
- Opslag: `concert-series-v1` (zaal, artiest, datums). Selecteer rijen van dezelfde artiest en zaal en kies "Als reeks beschouwen" / "Reeks opheffen".
  Een reeks toont een gedeeld accent en een label "Reeks · N shows". Maximaal 31 dagen tussen eerste en laatste datum (zoals de bestaande groepering).
- De import groepeert op opeenvolgende dagen óf een handmatige reeks. Bestaande aparte reeksen samenvoegen alleen als de tweede geen showgegevens heeft.

**Fasering:** (2a) aliassen in agenda + import + CSV; (2b) verplaatsen van bestaande concerten; (2c) reeksen. Elke fase eigen PR met tests en live-verificatie.
