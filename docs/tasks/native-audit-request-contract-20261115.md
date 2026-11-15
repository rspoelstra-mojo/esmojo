# Native audit verzoekcontract corrigeren

Vervolg op PR192. Productieproef bevestigt native Shows/Reports/accounts,
Supabase Auth, Redis nog legacy, 3 accounts/1 foto en Artiestencontrole geslaagd.
Shows-proef stuurde onterecht actor naar alle pure leesregels; alleen ticket-read
vereist actor. Website gebruikt de juiste afzonderlijke contracten. Corrigeer
uitsluitend proef en voeg regressie op echte leesregels toe. Geen bedrijfswrite,
mails, schemawijziging of bredere publicatie. Eigenaar huidige Codex-uitvoering.
