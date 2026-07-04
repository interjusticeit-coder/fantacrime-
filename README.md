# Fantacrime

Prototipo funzionante: gioco settimanale dove il "cervellone" (Claude) genera
un caso di fantasia, gli utenti creano la propria squadra con personaggi
inventati e un colpevole segreto, e gli altri utenti indovinano.

Tutto lo stack usato qui ha un piano gratuito sufficiente per testare l'app
con un gruppo di utenti reale.

## Cosa serve (tutto gratis)

1. Un account **GitHub** (per ospitare il codice)
2. Un account **Vercel** (per pubblicare il sito e le funzioni serverless) — vercel.com, login con GitHub
3. Un account **Supabase** (per il database) — supabase.com, login con GitHub
4. Una **API key di Anthropic** — console.anthropic.com (l'uso a basso volume rientra nei crediti gratuiti iniziali; oltre quelli si paga a consumo, molto economico per un test)

## Passo 1 — Metti il codice su GitHub

```bash
cd fantacrime
git init
git add .
git commit -m "primo commit fantacrime"
```

Poi crea un repository vuoto su github.com (senza README), e:

```bash
git remote add origin https://github.com/TUO-USERNAME/fantacrime.git
git branch -M main
git push -u origin main
```

## Passo 2 — Crea il database su Supabase

1. Vai su supabase.com → New project (scegli una password per il DB, tienila da parte)
2. Una volta creato, vai su **SQL Editor** → incolla tutto il contenuto di `supabase/schema.sql` → Run
3. Vai su **Project Settings → API** e copia:
   - `Project URL` → sarà la tua `VITE_SUPABASE_URL`
   - `anon public key` → sarà la tua `VITE_SUPABASE_ANON_KEY`

## Passo 3 — Pubblica su Vercel

1. Vai su vercel.com → **Add New → Project** → importa il repository `fantacrime` da GitHub
2. Nella schermata di configurazione, apri **Environment Variables** e aggiungi:
   - `VITE_SUPABASE_URL` = quella copiata da Supabase
   - `VITE_SUPABASE_ANON_KEY` = quella copiata da Supabase
   - `ANTHROPIC_API_KEY` = la tua API key di Anthropic (questa resta solo lato server, mai visibile nel browser)
3. Clicca **Deploy**

Dopo un minuto avrai un link tipo `https://fantacrime.vercel.app` — condividilo con chi vuoi far testare l'app.

## Sviluppo locale (opzionale, prima di pubblicare)

```bash
npm install
cp .env.example .env.local   # poi riempi i valori
npm run dev
```

Nota: in locale le funzioni `/api/*` non girano con `vite dev` da sole — per
testarle in locale serve la CLI di Vercel:

```bash
npm install -g vercel
vercel dev
```

## Struttura del progetto

```
fantacrime/
  src/
    components/
      CaseGenerator.jsx   -> genera il caso settimanale (chiama /api/generate-case)
      TeamCreator.jsx     -> form per creare personaggi + colpevole segreto
      Leaderboard.jsx     -> classifica utenti
    App.jsx               -> navigazione a tab
  api/
    generate-case.js      -> funzione serverless: chiama Claude, restituisce il caso
    moderate.js           -> funzione serverless: controlla i testi degli utenti
  supabase/
    schema.sql            -> tabelle del database
```

## Cosa manca per andare oltre il test

- **Autenticazione utenti** reale (oggi si usa solo un campo "nome utente" libero, va bene per un test tra amici ma non per il pubblico)
- **Scoring automatico**: oggi salviamo gli indovinelli in tabella `indovinelli` ma il calcolo dei punti (`punteggi`) va aggiunto — o con una funzione Supabase Edge, o lato client dopo la conferma dell'admin
- **Cron settimanale** per generare il caso automaticamente ogni lunedì (Vercel Cron Jobs, gratis fino a un certo numero di esecuzioni)
- **Regole RLS più strette** su Supabase quando l'app cresce oltre la cerchia di test
