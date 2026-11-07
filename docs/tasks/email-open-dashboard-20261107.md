# Openingsstatus verzonden showmails

Eigenaar Codex. Gevraagd: onder Beheerder / Email twee kaarten met elk de laatste
10 verzendingen (showrapportage en showprofiel), klikbare rijen en een overlay
met alle ontvangers en hun openingsvinkje.

Onderzoek: rapportageregister heeft ontvanger/provider-ID/verzendtijd maar geen
klikregistratie. Aparte showprofielmailflow is nog niet aangetroffen; de bestaande
rapportagemail gebruikt momenteel de knoptekst ‘Showprofiel openen’.

Voorstel: nieuwe ontvangergebonden link in URL-fragment, pas registreren na
bestaande login/MFA en openen van de bedoelde pagina door dezelfde ontvanger.
Geen trackingpixels of toeschrijven van scans aan gebruikers. Vertrouwelijke
registratie in Drive via bestaande beveiligde Vercel/Apps Script-route, alleen
beheerder kan overzichten lezen. Geen nieuwe accounts/rechten of testmails.

Gebruiker bevestigt: klikregistratie Vertrouwelijk via Drive/Vercel; tweede
blok klaarzetten voor toekomstige showprofielmailflow. Oude
mails hebben zonder eerdere registratie geen aantoonbare openingsstatus.

Verwachte scope: email-admin UI/CSS, mailactie-link/routeafhandeling, beveiligde
API en bestaand Drive-verzendregister, documentatie en gerichte tests. Geen
wijziging van mailmoment, ontvangerselectie of bijlagen.

Aanvullend gebruikersverzoek: voor accounts met uitsluitend Rapportages het
homepage-icoon verbergen en root meteen vervangen door /rapportages, vóór enig
homepage-renderen. Bestaande serverweigering van homepagegegevens blijft intact.
Andere modules, rollen, directe rapportagelinks en beheerdersrechten behouden.
