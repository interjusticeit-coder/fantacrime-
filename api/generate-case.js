// Funzione serverless Vercel: /api/generate-case
// Genera un nuovo caso di fantasia usando Claude, ed evita ripetizioni
// controllando gli ultimi casi già usati (passati dal frontend o dal DB).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata' })
  }

  const { casiPrecedenti = [] } = req.body || {}

  const evitaRipetizioni = casiPrecedenti.length
    ? `Evita queste ambientazioni/metodi già usati di recente: ${casiPrecedenti
        .map((c) => `${c.ambientazione} / ${c.metodo}`)
        .join(', ')}.`
    : ''

  const prompt = `Genera un caso di fantasia per un gioco settimanale chiamato "fantacrime", in italiano.
Il caso deve essere completamente inventato (nessun riferimento a persone o eventi reali), tono da giallo classico, adatto come base che diverse squadre di giocatori personalizzeranno con propri personaggi e un proprio colpevole segreto.
${evitaRipetizioni}

Rispondi SOLO con un oggetto JSON valido, nessun testo prima o dopo, nessun blocco markdown, con questa struttura esatta:
{
  "ambientazione": "breve descrizione del luogo/contesto",
  "metodo": "breve descrizione del metodo",
  "titolo": "titolo breve ed evocativo",
  "scena": "descrizione della scena del crimine in 2-3 frasi, senza rivelare un colpevole",
  "indizi": ["indizio 1", "indizio 2", "indizio 3", "indizio 4"],
  "ruoli": ["ruolo 1 da personalizzare", "ruolo 2", "ruolo 3", "ruolo 4"]
}`

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
        max_tokens: 1000,
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
