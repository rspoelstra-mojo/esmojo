# Standaardafbeeldingen Barrieropstelling

De vijf PNG’s zijn op 3 november 2026 aangeleverd in Archief.zip. De inhoud is
ongewijzigd overgenomen; alleen de bestandsnamen sluiten aan op de bestaande
centrale configuratie in shared/barrier-layout.js.

| Aangeleverd bestand | Geconfigureerd bestand |
| --- | --- |
| `Seated.png` | `Minimalistische zitplaatsindeling met podium.png` |
| `Staand_zondergoldencircle.png` | `Staankaart met podiumindeling.png` |
| `Staand_metgoldencircle.png` | `Minimalistische concertzaalindeling.png` |
| `Staand_metcatwalk.png` | `Strakke Plattegrond met Podium en Catwalk.png` |
| `Staand_metcatwalk_metgoldencircle.png` | `Concertindeling met Gouden Cirkels.png` |

`src/barrier-images.js` neemt de bestanden automatisch mee bij de normale build.
De weergave behoudt de oorspronkelijke verhoudingen met object-fit: contain.
Ontbrekende bestanden blijven een neutrale placeholder en blokkeren afronden niet.
