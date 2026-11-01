# Automatisch invullen verwart 2FA-annulering met aanmelden

Eigenaar: account A. Gebruikersvideo toont correct gevulde 2FA-invoer en daarna
direct terug naar leeg loginformulier, zonder zichtbare codefout. Geen video,
frames, codes of persoonsgegevens in deze repository opnemen.

De knop Terug naar inloggen stond binnen hetzelfde formulier als Bevestigen.
Maak daarvan Annuleren buiten het formulier, met data-1p-ignore, en geef de
primaire knop expliciet type=submit. Zo is maar één actie in het formulier
beschikbaar voor automatisch verzenden. Behoud handmatig annuleren, de
verzendvergrendeling, de 72-uurs sessie en verplichte server-side TOTP-controle.
De echte extensie is niet in de testomgeving aanwezig: video en simulatie
onderbouwen de wijziging, definitieve bevestiging komt van de gebruiker.

Controles: build en bestaande authenticatie-/sessietests slagen. Chromium met
fictieve gegevens controleert één expliciete submitknop in het TOTP-formulier,
Annuleren als sibling buiten het formulier, handmatig annuleren, automatische
knopkeuze, foutieve code/retry, hervatten na verversen en automatisch verlopen
van de 72-uurs sessie. De eerdere dubbele-verzendvergrendeling blijft behouden.
