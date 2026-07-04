// Funzione serverless Vercel: /api/moderate
// Controlla il testo scritto dagli utenti (personaggi, moventi) prima
// della pubblicazione: blocca nomi di persone reali, contenuti offensivi,
// riferimenti a fatti di cronaca reale.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata' })
  }

  const { testo } = req.body || {}
  if (!testo || typeof testo !== 'string') {
    return res.status(400).json({ error: 'Campo "testo" mancante' })
  }

  const prompt = `Analizza questo testo scritto da un utente per un gioco di fantasia investigativa ("fantacrime"). Il testo deve descrivere SOLO personaggi e situazioni di pura invenzione.

Testo da controllare:
"""
${testo}
"""

Rispondi SOLO con un oggetto JSON valido, nessun altro testo, con questa struttura:
{
  "approvato": true/false,
  "motivo": "breve spiegazione, vuoto se approvato",
  "categorie_problema": ["nomi_persone_reali" | "linguaggio_offensivo" | "riferimento_caso_reale" | "altro"]
}

Blocca il testo se: contiene nomi di persone reali identificabili, fa riferimento a casi di cronaca reale realmente accaduti, contiene linguaggio d'odio o offensivo, o incoraggia comportamenti illegali.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(502).json({ error: 'Errore chiamando Claude', dettagli: errText })
    }

    const data = await response.json()
    const textBlock = data.content.find((b) => b.type === 'text')
    const clean = textBlock.text
      .trim()
      .replace(/^```json/, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim()

    const parsed = JSON.parse(clean)
    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: 'Errore interno', dettagli: String(err) })
  }
}
