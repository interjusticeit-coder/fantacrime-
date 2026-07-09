// Funzione serverless Vercel: /api/evolvi-capitolo
// Pensata per essere chiamata automaticamente da un Cron Job di Vercel
// ogni lunedì (vedi vercel.json), oppure manualmente dal pulsante
// "Aggiungi evento settimanale" nel sito. Scrive il capitolo successivo
// del caso attuale, ispirandosi a notizie reali e alle teorie dei
// giocatori, e assegna punti a chi ci aveva visto giusto.
//
// Resta "spenta" (risponde con un errore controllato, senza rompere
// nulla) finché ANTHROPIC_API_KEY non è configurata su Vercel.

import { createClient } from '@supabase/supabase-js'

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
    // 1. Prendi il caso più recente
    const { data: caso, error: casoError } = await supabase
      .from('casi')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (casoError) throw casoError
    if (!caso) return res.status(200).json({ skipped: true, motivo: 'Nessun caso attivo.' })

    // 2. Trova il numero del prossimo capitolo
    const { data: capitoliEsistenti, error: capError } = await supabase
      .from('capitoli')
      .select('numero')
      .eq('caso_id', caso.id)
      .order('numero', { ascending: false })
      .limit(1)

    if (capError) throw capError
    const prossimoNumero = (capitoliEsistenti?.[0]?.numero || 0) + 1

    // 3. Leggi le teorie recenti dei giocatori
    const { data: commenti, error: commentiError } = await supabase
      .from('commenti')
      .select('id, nome_utente, testo')
      .eq('caso_id', caso.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (commentiError) throw commentiError

    const listaTeorie = (commenti || [])
      .map((c) => `- (${c.id}) ${c.nome_utente}: "${c.testo}"`)
      .join('\n') || 'Nessuna teoria pubblicata finora.'

    // 4. Chiama Claude con web_search per ispirarsi a eventi reali
    const prompt = `Sei lo sceneggiatore del gioco settimanale "fantacrime", in italiano.

Caso in corso: "${caso.titolo}"
Ambientazione: ${caso.ambientazione}
Metodo: ${caso.metodo}
Scena finora: ${caso.scena}
Indizi già noti: ${(caso.indizi || []).join(' | ')}

Questo è il capitolo numero ${prossimoNumero}.

Teorie pubblicate dai giocatori finora:
${listaTeorie}

Cerca 2-3 notizie di cronaca recenti (qualsiasi ambito: fatti di attualità,
curiosità, casi giudiziari) che possano darti un vago spunto stilistico o
tematico (NON riferimenti diretti a persone reali, resta tutto di fantasia).

Scrivi il capitolo successivo di questo caso di fantasia: 3-5 frasi,
tono da giallo, che introduca un nuovo indizio o un colpo di scena.
Puoi far riferimento in modo implicito ad alcune delle teorie sopra
(confermandole parzialmente, smentendole, o rimettendole in discussione),
ma non confermare mai apertamente chi è il vero colpevole.

Rispondi SOLO con un oggetto JSON valido, nessun testo prima o dopo,
nessun blocco markdown, con questa struttura esatta:
{
  "testo": "il nuovo capitolo",
  "tag": "colpo di scena" | "cronaca" | "normale",
  "eventi_reali": ["breve descrizione evento 1", "breve descrizione evento 2"],
  "teorie_confermate": ["id1", "id2"],
  "teorie_smentite": ["id3"]
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(502).json({ error: 'Errore chiamando Claude', dettagli: errText })
    }

    const data = await response.json()

    // Tra i blocchi di risposta, prendiamo l'ultimo blocco di testo
    // (quello dopo eventuali ricerche web)
    const blocchiTesto = (data.content || []).filter((b) => b.type === 'text')
    const testoGrezzo = blocchiTesto.length
      ? blocchiTesto[blocchiTesto.length - 1].text
      : ''

    if (!testoGrezzo) {
      return res.status(502).json({ error: 'Claude non ha restituito testo', dettagli: data })
    }

    // Claude a volte avvolge il JSON in ```json ... ``` nonostante le
    // istruzioni: ripuliamo prima di fare il parse
    const testoPulito = testoGrezzo
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let capitoloGenerato
    try {
      capitoloGenerato = JSON.parse(testoPulito)
    } catch (parseErr) {
      return res.status(502).json({
        error: 'Risposta di Claude non era JSON valido',
        dettagli: testoGrezzo
      })
    }

    const {
      testo,
      tag,
      eventi_reali: eventiReali,
      teorie_confermate: teorieConfermate,
      teorie_smentite: teorieSmentite
    } = capitoloGenerato

    if (!testo) {
      return res.status(502).json({ error: 'Il capitolo generato non contiene "testo"', dettagli: capitoloGenerato })
    }

    // 5. Salva il nuovo capitolo
    const { data: nuovoCapitolo, error: insertError } = await supabase
      .from('capitoli')
      .insert({
        caso_id: caso.id,
        numero: prossimoNumero,
        testo,
        tag: tag || 'normale',
        eventi_reali: eventiReali || []
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 6. Assegna punti a chi aveva teorie confermate/smentite
    const idConfermate = teorieConfermate || []
    const idSmentite = teorieSmentite || []

    if (idConfermate.length) {
      const { error: confError } = await supabase
        .from('commenti')
        .update({ punti_guadagnati: 10, esito: 'confermata' })
        .in('id', idConfermate)
      if (confError) throw confError
    }

    if (idSmentite.length) {
      const { error: smentError } = await supabase
        .from('commenti')
        .update({ punti_guadagnati: -5, esito: 'smentita' })
        .in('id', idSmentite)
      if (smentError) throw smentError
    }

    return res.status(200).json({
      ok: true,
      capitolo: nuovoCapitolo,
      teorie_confermate: idConfermate,
      teorie_smentite: idSmentite
    })
  } catch (err) {
    console.error('Errore in evolvi-capitolo:', err)
    return res.status(500).json({ error: 'Errore interno', dettagli: err.message })
  }
}
