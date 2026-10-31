# E-mail

Gebruik voor alle toekomstige e-mails `sendEmail` uit `server/email.js`.
Het vaste afzenderadres is `ESMOJO <no-reply@esmojo.nl>` en kan niet
door de aanroepende functie worden overschreven.

Deze module is uitsluitend voor servercode (bijvoorbeeld een Vercel Function).
Importeer hem nooit in de frontend onder `src/`. `RESEND_API_KEY` moet als
servervariabele in Vercel beschikbaar zijn; gebruik geen `VITE_`-prefix.

Er is nog geen verzendendpoint of automatische e-mailflow. Deze module
verstuurt pas iets als toekomstige servercode `sendEmail` aanroept.
Andere applicaties die dezelfde Resend-account gebruiken vallen niet onder
deze instelling. Het adres maakt geen mailbox voor inkomende e-mail aan.
