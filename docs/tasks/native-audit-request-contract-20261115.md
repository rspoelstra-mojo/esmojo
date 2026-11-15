# Native audit verzoekcontract corrigeren

Vervolg op PR192. Productieproef bevestigt native Shows/Reports/accounts,
Supabase Auth, Redis nog legacy, 3 accounts/1 foto en Artiestencontrole geslaagd.
Shows-proef stuurde onterecht actor naar alle pure leesregels; alleen ticket-read
vereist actor. Website gebruikt de juiste afzonderlijke contracten. Corrigeer
uitsluitend proef en voeg regressie op echte leesregels toe. Geen bedrijfswrite,
mails, schemawijziging of bredere publicatie. Eigenaar huidige Codex-uitvoering.

Regressie gebruikt de echte vijf pure leesregels en controleert dat de bron niet
verandert. Actor uitsluitend bij ticket-read. Een nog niet afgerond showprofiel
geeft bij PDF-status normaal REPORT_NOT_READY: dit telt apart als pendingPdf, niet
als gereed bestand of kapotte site. Geen PDF genereren om een proef te laten slagen.
Header/protocolversie 3 voorkomt dat de workflow de oude proef vóór deployment raakt.
Elf gerichte tests, build en diffcontrole geslaagd.
