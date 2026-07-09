// Funzione serverless Vercel: /api/generate-case-options
// Genera 3 proposte di caso (solo testo) usando Claude (Anthropic),
// la stessa chiave già usata per il cervellone autonomo. Niente
// immagini per ora: l'utente sceglie una delle 3 proposte testuali
// nel frontend, e solo quella scelta verrà salvata su Supabase.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata' })
  }

  const { casiPrecedenti = [] } = req.body || {}

  const evitaRipetizioni = casiPrecedenti.length
    ? `Evita queste ambientazioni/metodi già usati di recente: ${casiPrecedenti
        .map((c) => `${c.ambientazione} / ${c.metodo}`)
        .join(', ')}.`
    : ''

  const prompt = `Genera 3 proposte DIVERSE tra loro di caso di fantasia per un gioco settimanale chiamato "fantacrime", in italiano.
Ogni caso deve essere completamente inventato (nessun riferimento a persone o eventi reali), tono da giallo classico, adatto come base che diverse squadre di giocatori personalizzeranno con propri personaggi e un proprio colpevole segreto.
${evitaRipetizioni}

IMPORTANTE sui campi brevi:
- "ambientazione" e "metodo" devono essere ETICHETTE BREVISSIME (1-3 parole, es. "Villa sul lago", "Avvelenamento"), NON frasi descrittive.
- ogni voce di "ruoli" deve essere un'ETICHETTA BREVE del ruolo (es. "Il maggiordomo", "La vedova"), MAI una frase con dettagli o descrizioni.

Rispondi SOLO con un array JSON valido di 3 oggetti, nessun testo prima o dopo, nessun blocco markdown, con questa struttura esatta per ciascun oggetto:
{
  "ambientazione": "etichetta breve",
  "metodo": "etichetta breve",
  "titolo": "titolo breve ed evocativo",
  "scena": "descrizione della scena del crimine in 2-3 frasi, senza rivelare un colpevole",
  "indizi": ["indizio 1", "indizio 2", "indizio 3", "indizio 4"],
  "ruoli": ["ruolo 1", "ruolo 2", "ruolo 3", "ruolo 4"]
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(502).json({ error: 'Errore chiamando Claude', dettagli: errText })
    }

    const data = await response.json()
    const rawText = data.content?.find((b) => b.type === 'text')?.text
    if (!rawText) {
      return res.status(502).json({ error: 'Risposta vuota o inattesa', dettagli: JSON.stringify(data) })
    }

    const clean = rawText
      .trim()
      .replace(/^```json/, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim()

    const opzioni = JSON.parse(clean)

    return res.status(200).json({ opzioni })
  } catch (err) {
    return res.status(500).json({ error: 'Errore interno', dettagli: String(err) })
  }
}
