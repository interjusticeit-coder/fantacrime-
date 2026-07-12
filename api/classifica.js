// Funzione serverless Vercel: /api/classifica
// Restituisce la classifica dei giocatori.
//
// NUOVA LOGICA: il punteggio di un giocatore è la somma, per ogni
// capitolo in cui ha votato, del punteggio che quel capitolo ha
// assegnato al ruolo su cui ha puntato (capitoli.punteggi_ruoli).
//
// Non esiste una tabella "utenti" con id univoco collegata ai punti:
// i giocatori sono identificati per nome_utente. Due persone con lo
// stesso nome finiscono nella stessa riga di classifica — limite noto.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Variabili Supabase non configurate' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 1. Tutti i voti (chi ha puntato su quale ruolo, in quale capitolo)
    const { data: voti, error: votiError } = await supabase
      .from('voti')
      .select('caso_id, nome_utente, ruolo_scelto, numero_capitolo')

    if (votiError) throw votiError

    if (!voti || voti.length === 0) {
      return res.status(200).json({ ok: true, classifica: [] })
    }

    // 2. Tutti i capitoli coinvolti, per leggere i punteggi_ruoli.
    // Filtriamo solo sui caso_id effettivamente votati, per non scaricare
    // capitoli inutili.
    const casoIds = [...new Set(voti.map((v) => v.caso_id))]

    const { data: capitoli, error: capitoliError } = await supabase
      .from('capitoli')
      .select('caso_id, numero, punteggi_ruoli')
      .in('caso_id', casoIds)

    if (capitoliError) throw capitoliError

    // Mappa veloce "caso_id::numero" -> punteggi_ruoli, per non fare
    // ricerche lineari dentro il ciclo dei voti
    const capitoloMap = new Map()
    for (const c of capitoli || []) {
      capitoloMap.set(`${c.caso_id}::${c.numero}`, c.punteggi_ruoli || {})
    }

    // 3. Sommiamo i punti per giocatore
    const classificaMap = new Map()

    for (const voto of voti) {
      const nome = voto.nome_utente || 'Anonimo'
      const chiaveCapitolo = `${voto.caso_id}::${voto.numero_capitolo}`
      const punteggiRuoli = capitoloMap.get(chiaveCapitolo)

      // Se il capitolo di quel round non esiste ancora (es. voto dato
      // ma il cervellone non ha ancora generato il capitolo), il delta
      // è 0 per ora: si aggiornerà da solo quando il capitolo uscirà,
      // dato che la classifica si ricalcola ogni volta da zero.
      const delta = punteggiRuoli && voto.ruolo_scelto in punteggiRuoli
        ? punteggiRuoli[voto.ruolo_scelto]
        : 0

      if (!classificaMap.has(nome)) {
        classificaMap.set(nome, {
          nome_utente: nome,
          punti_totali: 0,
          voti_totali: 0
        })
      }

      const voce = classificaMap.get(nome)
      voce.punti_totali += delta
      voce.voti_totali += 1
    }

    const classifica = Array.from(classificaMap.values()).sort(
      (a, b) => b.punti_totali - a.punti_totali
    )

    return res.status(200).json({ ok: true, classifica })
  } catch (err) {
    console.error('Errore in classifica:', err)
    return res.status(500).json({ error: 'Errore interno', dettagli: err.message })
  }
}
