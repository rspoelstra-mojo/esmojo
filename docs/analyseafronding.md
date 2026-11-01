# Definitieve bezoekers- en artiestanalyse

Eindcijfer en toelichting zijn op 1 november 2026 expliciet Openbaar verklaard. Ze staan in een afzonderlijk analyseafronding.json in de canonieke concert/reeksmap in Drive; bestaande vertrouwelijke bezoekersdata en openbare AI-bestanden blijven gescheiden. Geen score, toelichting of ticketinhoud in logs of persistente browseropslag.

Bezoekers is gereed na onderwerpen 1–4 met status completed én geldige content/completed_at voor alle drie ticketvelden (de echte showdagen moeten overeenkomen). Artiest is gereed na onderwerpen 5–11. Een read geeft alleen gereedheid, definitieve status en technische revisiebasis terug, geen vertrouwelijke ticketinhoud of historie.

De server vereist een geheel cijfer 1–10, een niet-lege toelichting van maximaal 2000 tekens en een actuele profiel-/afrondingsrevisie; voor bezoekers ook actuele veldversies. Authenticatie/MFA en de bestaande Drive-HMAC blijven verplicht. Definitief opslaan en onderliggende wijzigingen delen de ownerlock. Dubbele of verouderde afronding wordt geweigerd.

Vóór een onderliggende profiel- of ticketwijziging wordt de relevante afronding gearchiveerd en ongeldig gemaakt. Zo kan een fout tijdens een daaropvolgende schrijfoperatie geen ten onrechte geldige eindstatus achterlaten. Een eerdere nieuwe reeksdatum verplaatst het eigen afrondingsbestand mee en maakt beide categorieën opnieuw te beoordelen; historie blijft behouden. Er worden geen PDF-versies herschreven of automatische risicocijfers berekend.

De knop verschijnt boven Analyse in beeld en verdwijnt na bevestigde opslag. De categorieteller wordt dan groen Definitief afgerond. De overlay vervangt visueel het hele inhoudsgebied, inclusief showkop/tabjes, terwijl beide menu’s vrij blijven. Het formulier blijft maximaal 1000px en volgt bestaande marges, typografie en thema’s. Sluiten/Escape bewaart geen onvoltooide eindbeoordeling.
