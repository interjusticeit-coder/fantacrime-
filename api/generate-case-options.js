// Funzione serverless Vercel: /api/generate-case-options
// Genera 3 proposte di caso (testo tramite Gemini) e per ciascuna
// un'immagine di copertina a tema (tramite Imagen 4 Fast, stesso
// provider/chiave di Gemini). L'utente sceglierà una delle 3 nel
// frontend; solo quella scelta verrà salvata su Supabase.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY non configurata' })
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
    const textResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 2500,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!textResponse.ok) {
      const errText = await textResponse.text()
      return res.status(502).json({ error: 'Errore generando i testi', dettagli: errText })
    }

    const textData = await textResponse.json()
    const rawText = textData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) {
      return res.status(502).json({ error: 'Risposta testo vuota o inattesa', dettagli: JSON.stringify(textData) })
    }

    const cleanText = rawText
      .trim()
      .replace(/^```json/, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim()

    const opzioni = JSON.parse(cleanText)

    // Per ciascuna opzione, generiamo un'immagine di copertina a tema
    const opzioniConImmagine = await Promise.all(
      opzioni.map(async (caso) => {
        const promptImmagine = `Copertina illustrata in stile noir/giallo investigativo per un caso intitolato "${caso.titolo}". Ambientazione: ${caso.ambientazione}. Atmosfera misteriosa, tetra, elegante, senza testo scritto nell'immagine, senza persone riconoscibili, stile pittorico/illustrativo, non fotorealistico.`

        try {
          const imgResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                instances: [{ prompt: promptImmagine }],
                parameters: { sampleCount: 1, aspectRatio: '1:1' }
              })
            }
          )

          if (!imgResponse.ok) {
            return { ...caso, immagine_url: null }
          }

          const imgData = await imgResponse.json()
          const pred = imgData.predictions?.[0]
          if (!pred?.bytesBase64Encoded) {
            return { ...caso, immagine_url: null }
          }

          const mime = pred.mimeType || 'image/png'
          return { ...caso, immagine_url: `data:${mime};base64,${pred.bytesBase64Encoded}` }
        } catch {
          return { ...caso, immagine_url: null }
        }
      })
    )

    return res.status(200).json({ opzioni: opzioniConImmagine })
  } catch (err) {
    return res.status(500).json({ error: 'Errore interno', dettagli: String(err) })
  }
}
