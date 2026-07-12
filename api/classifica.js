// Funzione serverless Vercel: /api/classifica
// Restituisce la classifica dei giocatori, aggregando i punti guadagnati
// su tutti i commenti (teorie) che hanno scritto, su tutti i casi.
//
// Non esiste una tabella "utenti" separata: i giocatori sono identificati
// per nome_utente. Questo significa che due persone con lo stesso nome
// finiscono nella stessa riga di classifica — è un limite noto, da
// risolvere in futuro con un vero sistema di account se serve.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Variabili Supabase non configurate' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Prendiamo tutti i commenti con un punteggio assegnato (non null,
    // non zero di default) e li aggreghiamo per nome_utente lato codice.
    // Con Supabase JS non è comodo fare GROUP BY server-side senza una
    // funzione Postgres dedicata: per il volume di dati di un gioco
    // come questo, aggregare qui è semplice e sufficiente.
    const { data: commenti, error } = await supabase
      .from('commenti')
      .select('nome_utente, punti_guadagnati, esito, caso_id')
      .not('esito', 'is', null)

    if (error) throw error

    const classificaMap = new Map()

    for (const c of commenti || []) {
      const nome = c.nome_utente || 'Anonimo'
      const punti = c.punti_guadagnati || 0

      if (!classificaMap.has(nome)) {
        classificaMap.set(nome, {
          nome_utente: nome,
          punti_totali: 0,
          teorie_confermate: 0,
          teorie_smentite: 0
        })
      }

      const voce = classificaMap.get(nome)
      voce.punti_totali += punti
      if (c.esito === 'confermata') voce.teorie_confermate += 1
      if (c.esito === 'smentita') voce.teorie_smentite += 1
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
