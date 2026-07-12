// Funzione serverless Vercel: /api/evolvi-capitolo
// Pensata per essere chiamata automaticamente da un Cron Job di Vercel
// ogni lunedì (vedi vercel.json), oppure manualmente dal pulsante
// "Aggiungi evento settimanale" nel sito.
//
// LOGICA DI PUNTEGGIO (per ruolo/sospettato, non più per singola teoria):
// Claude genera due segnali separati per ciascun ruolo del caso, ognuno
// da -10 a +10:
//   - punteggio_notizie:    basato SOLO su notizie/statistiche reali
//                           generiche (mai il caso specifico)
//   - punteggio_giocatori:  basato sull'attività dei giocatori nei
//                           commenti (teorie a favore/contro quel ruolo)
//
// Il codice (non l'AI) combina i due con un peso FISSO:
//   delta_finale = round(punteggio_notizie * 0.9 + punteggio_giocatori * 0.1)
// Questo garantisce che l'influenza dei giocatori resti sempre al
// massimo il 10%, indipendentemente da quanto "convincente" sia il
// testo che scrivono — la percentuale non è un'istruzione che l'AI
// potrebbe interpretare in modo approssimativo, è aritmetica.
//
// Il delta finale viene sempre "clampato" tra -10 e +10 per capitolo.
//
// Resta "spenta" (risponde con un errore controllato, senza rompere
// nulla) finché ANTHROPIC_API_KEY non è configurata su Vercel.

import { createClient } from '@supabase/supabase-js'

const PESO_NOTIZIE = 0.9
const PESO_GIOCATORI = 0.1
const DELTA_MIN = -10
const DELTA_MAX = 10

const TAG_VALIDI = ['colpo di scena', 'cronaca', 'normale']

function clamp(numero, min, max) {
  return Math.max(min, Math.min(max, numero))
}

// Estrae il primo oggetto JSON plausibile da un testo, anche se Claude
// ha aggiunto commenti o code fence intorno (capita spesso con web_search).
function estraiJson(testoGrezzo) {
  const inizio = testoGrezzo.indexOf('{')
  const fine = testoGrezzo.lastIndexOf('}')
  if (inizio === -1 || fine === -1 || fine < inizio) return null
  try {
    return JSON.parse(testoGrezzo.slice(inizio, fine + 1))
  } catch {
    return null
  }
}

// Controlla che l'oggetto generato da Claude abbia la forma attesa.
function validaCapitolo(obj, ruoliValidi) {
  const problemi = []

  if (typeof obj !== 'object' || obj === null) {
    return ['la risposta non è un oggetto JSON']
  }
  if (typeof obj.testo !== 'string' || obj.testo.trim().length < 10) {
    problemi.push('"testo" mancante o troppo corto')
  }
  if (obj.tag !== undefined && !TAG_VALIDI.includes(obj.tag)) {
    problemi.push(`"tag" non valido: ${obj.tag}`)
  }
  if (obj.eventi_reali !== undefined && !Array.isArray(obj.eventi_reali)) {
    problemi.push('"eventi_reali" deve essere un array')
  }

  for (const campo of ['punteggio_notizie', 'punteggio_giocatori']) {
    if (typeof obj[campo] !== 'object' || obj[campo] === null || Array.isArray(obj[campo])) {
      problemi.push(`"${campo}" deve essere un oggetto {ruolo: numero}`)
      continue
    }
    for (const ruolo of Object.keys(obj[campo])) {
      if (!ruoliValidi.includes(ruolo)) {
        problemi.push(`"${campo}" contiene un ruolo inesistente: "${ruolo}"`)
      }
      const valore = obj[campo][ruolo]
      if (typeof valore !== 'number' || Number.isNaN(valore)) {
        problemi.push(`"${campo}.${ruolo}" non è un numero valido`)
      }
    }
    for (const ruolo of ruoliValidi) {
      if (!(ruolo in obj[campo])) {
        problemi.push(`"${campo}" non include il ruolo "${ruolo}"`)
      }
    }
  }

  return problemi
}

async function chiedeCapitoloAClaude({ anthropicKey, prompt }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    return { ok: false, motivo: 'chiamata_fallita', dettagli: errText }
  }

  const data = await response.json()
  const blocchiTesto = (data.content || []).filter((b) => b.type === 'text')
  const testoGrezzo = blocchiTesto.map((b) => b.text).join('\n')

  if (!testoGrezzo) {
    return { ok: false, motivo: 'nessun_testo', dettagli: data }
  }

  const capitolo = estraiJson(testoGrezzo)
  if (!capitolo) {
    return { ok: false, motivo: 'json_non_valido', dettagli: testoGrezzo }
  }

  return { ok: true, capitolo, testoGrezzo }
}

async function chiamaClaudeConRetry({ anthropicKey, promptIniziale, ruoliValidi }) {
  let prompt = promptIniziale

  for (let tentativo = 1; tentativo <= 2; tentativo++) {
    const risultato = await chiedeCapitoloAClaude({ anthropicKey, prompt })

    if (!risultato.ok) {
      if (tentativo === 2) {
        return {
          ok: false,
          errore: { error: `Claude non ha risposto correttamente (${risultato.motivo})`, dettagli: risultato.dettagli }
        }
      }
      prompt = `${promptIniziale}\n\nATTENZIONE: nel tentativo precedente la tua risposta non era un JSON valido o non conteneva testo. Rispondi SOLO con l'oggetto JSON richiesto, senza alcun commento prima o dopo, senza blocchi markdown.`
      continue
    }

    const problemi = validaCapitolo(risultato.capitolo, ruoliValidi)
    if (problemi.length === 0) {
      return { ok: true, capitolo: risultato.capitolo }
    }

    if (tentativo === 2) {
      return {
        ok: false,
        errore: { error: 'Il capitolo generato non rispetta lo schema atteso', dettagli: problemi }
      }
    }

    prompt = `${promptIniziale}\n\nATTENZIONE: il tentativo precedente aveva questi problemi: ${problemi.join('; ')}. Correggi e rispondi SOLO con l'oggetto JSON valido richiesto, assicurandoti di includere OGNI ruolo elencato in entrambi i campi punteggio_notizie e punteggio_giocatori.`
  }
}

function calcolaDeltaFinale(punteggioNotizie, punteggioGiocatori, ruoli) {
  const deltaPerRuolo = {}
  for (const ruolo of ruoli) {
    const notizie = punteggioNotizie[ruolo] ?? 0
    const giocatori = punteggioGiocatori[ruolo] ?? 0
    const grezzo = notizie * PESO_NOTIZIE + giocatori * PESO_GIOCATORI
    deltaPerRuolo[ruolo] = clamp(Math.round(grezzo), DELTA_MIN, DELTA_MAX)
  }
  return deltaPerRuolo
}

export default async function handler(req, res) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return res.status(200).json({
      skipped: true,
      motivo: 'ANTHROPIC_API_KEY non configurata: il cervellone autonomo è spento per ora.'
    })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Variabili Supabase non configurate' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: caso, error: casoError } = await supabase
      .from('casi')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (casoError) throw casoError
    if (!caso) return res.status(200).json({ skipped: true, motivo: 'Nessun caso attivo.' })

    const ruoli = caso.ruoli || []
    if (ruoli.length === 0) {
      return res.status(200).json({ skipped: true, motivo: 'Il caso non ha ruoli su cui assegnare punteggi.' })
    }

    const { data: capitoliEsistenti, error: capError } = await supabase
      .from('capitoli')
      .select('numero')
      .eq('caso_id', caso.id)
      .order('numero', { ascending: false })
      .limit(1)

    if (capError) throw capError
    const prossimoNumero = (capitoliEsistenti?.[0]?.numero || 0) + 1

    const { data: commenti, error: commentiError } = await supabase
      .from('commenti')
      .select('id, nome_utente, testo')
      .eq('caso_id', caso.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (commentiError) throw commentiError

    const listaTeorie = (commenti || [])
      .map((c) => `- ${c.nome_utente}: "${c.testo}"`)
      .join('\n') || 'Nessuna teoria pubblicata finora.'

    const prompt = `Sei il "cervellone" del gioco settimanale "fantacrime", in italiano.

Caso in corso: "${caso.titolo}"
Ambientazione: ${caso.ambientazione}
Metodo: ${caso.metodo}
Scena finora: ${caso.scena}
Indizi già noti: ${(caso.indizi || []).join(' | ')}
Ruoli/sospettati su cui i giocatori possono puntare: ${ruoli.join(' | ')}

Questo è il capitolo numero ${prossimoNumero}.

Teorie pubblicate dai giocatori finora (segnale interno):
${listaTeorie}

--- PARTE 1: segnale esterno ---
Cerca 2-3 notizie di cronaca o statistiche di criminalità reali e generiche
(qualsiasi ambito: trend nazionali, curiosità investigative, casi
giudiziari) che possano darti uno spunto stilistico o tematico.
NON riferimenti diretti a persone o casi reali specifici: usale solo come
ispirazione per decidere come muovere la trama.

In base a questo, assegna un "punteggio_notizie" da -10 a +10 per
CIASCUNO dei ruoli elencati sopra: quanto le notizie/statistiche
rendono quel ruolo più sospetto (valori positivi) o più scagionato
(valori negativi) in questo capitolo.

--- PARTE 2: segnale interno ---
Analizza le teorie dei giocatori sopra. Assegna un "punteggio_giocatori"
da -10 a +10 per CIASCUNO dei ruoli: quanto le teorie dei giocatori
puntano su quel ruolo come colpevole (positivo) o lo scagionano
(negativo). Se non ci sono teorie su un ruolo, usa 0.

--- PARTE 3: capitolo narrativo ---
Scrivi il capitolo successivo di questo caso di fantasia: 3-5 frasi,
tono da giallo, che introduca un nuovo indizio o un colpo di scena,
coerente con i punteggi che hai assegnato sopra (es. se un ruolo sale
molto, il capitolo dovrebbe contenere un indizio che lo rende più
sospetto). Non confermare mai apertamente chi è il vero colpevole.

Rispondi SOLO con un oggetto JSON valido, nessun testo prima o dopo,
nessun blocco markdown, con questa struttura esatta (includi OGNI
ruolo elencato sopra in entrambi punteggio_notizie e punteggio_giocatori):
{
  "testo": "il nuovo capitolo",
  "tag": "colpo di scena" | "cronaca" | "normale",
  "eventi_reali": ["breve descrizione evento 1", "breve descrizione evento 2"],
  "punteggio_notizie": { "${ruoli[0] || 'Ruolo'}": 0 },
  "punteggio_giocatori": { "${ruoli[0] || 'Ruolo'}": 0 }
}`

    const risultatoClaude = await chiamaClaudeConRetry({
      anthropicKey,
      promptIniziale: prompt,
      ruoliValidi: ruoli
    })

    if (!risultatoClaude.ok) {
      return res.status(502).json(risultatoClaude.errore)
    }

    const {
      testo,
      tag,
      eventi_reali: eventiReali,
      punteggio_notizie: punteggioNotizie,
      punteggio_giocatori: punteggioGiocatori
    } = risultatoClaude.capitolo

    const punteggiRuoli = calcolaDeltaFinale(punteggioNotizie, punteggioGiocatori, ruoli)

    const { data: nuovoCapitolo, error: insertError } = await supabase
      .from('capitoli')
      .insert({
        caso_id: caso.id,
        numero: prossimoNumero,
        testo,
        tag: tag || 'normale',
        eventi_reali: eventiReali || [],
        punteggi_ruoli: punteggiRuoli
      })
      .select()
      .single()

    if (insertError) throw insertError

    return res.status(200).json({
      ok: true,
      capitolo: nuovoCapitolo,
      punteggi_ruoli: punteggiRuoli
    })
  } catch (err) {
    console.error('Errore in evolvi-capitolo:', err)
    return res.status(500).json({ error: 'Errore interno', dettagli: err.message })
  }
}
