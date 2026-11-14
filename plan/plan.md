# Desert Storm Planner (Last War: Survival)

## Platform
Web app

## Cos'è
Un pianificatore per l'evento Desert Storm di Last War: Survival: si gestiscono i membri dell'alleanza, si formano Team A e Team B e si assegnano i giocatori agli 11 edifici sulla mappa.
Il piano finale si esporta come immagine pulita da condividere in chat d'alleanza o su Discord.

## Per chi è
Un ufficiale/leader d'alleanza (l'utente) che prepara da solo il piano di battaglia, senza login.

## Punto di partenza
Il lavoro riparte dal progetto esistente dell'utente: https://github.com/Pierba80/Desert-Storm-Planner (pubblico, derivato dal suo Canyon planner). Si correggono i problemi e si aggiunge quanto manca, mantenendo le funzioni già presenti.

Problemi trovati nel progetto attuale, da correggere:
- La mappa è trattata con una proporzione sbagliata (circa 4:3), mentre l'immagine reale è larga (1672×941). Per questo i punti cliccabili non coincidono con gli edifici disegnati.
- Le posizioni predefinite di alcuni edifici sono sbagliate (es. Mercenary è in basso a sinistra, ma sulla mappa è in basso al centro).
- I nomi degli edifici non corrispondono a quelli scritti sulla mappa.
- Sono rimasti pezzi delle "rotte/frecce" del Canyon planner che bloccano l'avvio dell'app (l'ultimo commit risulta fallito).
- La lista membri contiene solo i nomi, senza potenza.

## Funzionalità principali ed esperienza
- **Mappa predefinita dell'utente**: la mappa Desert Storm (https://customer-assets-lqy194kg.emergentagent.net/job_desert-planner--2vgjtevj/artifacts/4deb3d6cf96aa9cf_Desert-map.png, già presente nel progetto come Desert-map.png) viene mostrata con la sua proporzione reale. È la stessa per Team A e Team B. Si può sostituire con un'altra immagine e ripristinare l'originale; in "Modifica layout" si trascinano punti e targhette; "Reset" ripristina le posizioni predefinite.
- **11 edifici, nomi uguali a quelli della mappa, posizioni corrette** (centro dell'edificio, in % di larghezza/altezza della mappa):
  - Info Center ~35/23 · Arsenal ~50/23 · Hospital-4 ~67/23
  - Oil - Petrol -1 ~23/37 · Silo ~50/51 · Hospital-2 ~78/36
  - Hospital-1 ~25/64 · Oil - Petrol -2 ~76/65
  - Hospital-3 ~32/80 · Mercenary ~50/76 · Tech center ~67/80
  
  Ogni punto è legato in modo univoco al suo edificio: cliccando si apre sempre quell'edificio, con il nome ben visibile nella finestra.
- **Zone blu e rossa ignorate**: le due zone colorate sulla mappa non sono cliccabili né assegnabili.
- **Finestra edificio**: clic su un edificio → si apre una finestra dove si inseriscono il leader e gli altri giocatori (con suggerimenti dai membri e dai giocatori non ancora assegnati).
- **Targhetta nomi sulla mappa**: per ogni edificio assegnato compare una targhetta con nome dell'edificio, leader e giocatori.
- **Nessuna sovrapposizione**: le targhette non coprono le altre targhette, gli edifici né le etichette già stampate sulla mappa, e restano dentro i bordi (le targhette della fila in basso si spostano di lato o sopra quando sotto non c'è spazio). Si possono anche trascinare a mano. Con molti giocatori la targhetta resta compatta (leader + primi nomi e "+N"); l'elenco completo è nella finestra e nell'export.
- **Stile oro/sabbia**: colori dell'interfaccia ripresi dalla mappa (arancio deserto, sabbia, oro, grigio scuro), targhette color sabbia chiaro come le etichette della mappa; Team A in blu e Team B in rosso.
- **Lista membri dell'alleanza**: nome, potenza e tipo di squadra; aggiunta rapida incollando un elenco; rimozione duplicati.
- **Team A / Team B**: per ogni team 20 titolari e 10 riserve; avviso se un giocatore è in entrambi i team o su due edifici; conteggio dei non assegnati.
- **Bilanciamento su richiesta**: le squadre si compongono a mano. Un pulsante "Bilancia squadre", usato solo quando l'utente lo decide, propone una divisione equilibrata per potenza tra Team A e Team B; la proposta si vede in anteprima e si applica solo dopo conferma, poi resta modificabile. Non tocca le assegnazioni agli edifici.
- **Export immagine**: PNG ad alta risoluzione per ogni team con titolo, mappa, targhette e riserve, uguale a quanto si vede a schermo.
- **Funzioni già presenti mantenute**: conto alla rovescia e promemoria della battaglia, schermata riserve, stampa/PDF del roster, aiuto, salvataggio automatico.

## Phase 1
- Correzione proporzioni mappa e posizioni/nomi degli 11 edifici
- Rimozione dei residui delle rotte che bloccano l'app
- Finestra edificio con leader + giocatori
- Targhette nomi senza sovrapposizioni (automatico + trascinamento manuale), identiche nell'export
- Stile oro/sabbia ripreso dalla mappa
- Lista membri con potenza e tipo di squadra
- Team A / Team B con 20 titolari e 10 riserve, avviso doppie assegnazioni
- Pulsante di bilanciamento per potenza, solo su richiesta e con conferma
- Export del piano come immagine
- Funzioni esistenti (countdown, riserve, stampa roster, salvataggio) funzionanti

Fasi successive: link di sola lettura per i membri, login per più ufficiali, iscrizione dei membri all'evento, interfaccia in italiano.

## Assumptions
- Interfaccia in inglese.
- Nessun login: i dati si salvano automaticamente sul dispositivo/browser in uso.
- La stessa mappa e le stesse posizioni degli edifici valgono per Team A e Team B; le assegnazioni sono separate per team.
- I nomi degli edifici sono fissi e non rinominabili, per evitare errori di corrispondenza.
- Ogni edificio ha un leader e un numero libero di giocatori.
- Le rotte/frecce del Canyon planner non servono per Desert Storm e vengono tolte.
- Le posizioni salvate in precedenza sul dispositivo vengono sostituite da quelle corrette (le assegnazioni dei giocatori restano).
- Leggibile anche da telefono.