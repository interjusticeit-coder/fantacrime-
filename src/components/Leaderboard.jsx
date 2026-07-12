import { useEffect, useState } from 'react'

// Componente "Classifica" per Fantacrime.
// Chiama /api/classifica e mostra i giocatori ordinati per punti totali.
//
// Stile scritto con CSS inline semplice per essere autonomo: se il resto
// dell'app usa Tailwind o classi CSS dedicate, conviene sostituire gli
// stili inline qui sotto con le classi già esistenti, per restare
// coerenti con il resto del sito (badge arrotondati, card chiare, ecc.
// visti nelle altre schermate).

const MEDAGLIE = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const [classifica, setClassifica] = useState(null)
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    let cancellato = false

    async function carica() {
      try {
        const risposta = await fetch('/api/classifica')
        if (!risposta.ok) {
          const testo = await risposta.text()
          throw new Error(testo)
        }
        const dati = await risposta.json()
        if (!cancellato) setClassifica(dati.classifica)
      } catch (err) {
        if (!cancellato) setErrore(err.message)
      }
    }

    carica()
    return () => {
      cancellato = true
    }
  }, [])

  if (errore) {
    return (
      <div style={stili.contenitore}>
        <div style={stili.errore}>Non sono riuscito a caricare la classifica.</div>
      </div>
    )
  }

  if (!classifica) {
    return (
      <div style={stili.contenitore}>
        <div style={stili.caricamento}>Carico la classifica…</div>
      </div>
    )
  }

  if (classifica.length === 0) {
    return (
      <div style={stili.contenitore}>
        <h2 style={stili.titolo}>Classifica</h2>
        <div style={stili.vuoto}>
          Nessun voto ancora. Punta su un sospettato e aspetta il prossimo capitolo.
        </div>
      </div>
    )
  }

  return (
    <div style={stili.contenitore}>
      <h2 style={stili.titolo}>Classifica</h2>
      <div style={stili.lista}>
        {classifica.map((giocatore, indice) => (
          <div key={giocatore.nome_utente} style={stili.riga}>
            <div style={stili.posizione}>
              {MEDAGLIE[indice] || `#${indice + 1}`}
            </div>
            <div style={stili.infoGiocatore}>
              <div style={stili.nome}>{giocatore.nome_utente}</div>
              <div style={stili.dettaglio}>
                {giocatore.voti_totali} {giocatore.voti_totali === 1 ? 'voto' : 'voti'} dati
              </div>
            </div>
            <div style={stili.punti}>{giocatore.punti_totali}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const stili = {
  contenitore: {
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e8e4dc',
    padding: '20px 24px',
    maxWidth: '480px'
  },
  titolo: {
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '14px'
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  riga: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderTop: '1px solid #f0ede6',
    paddingTop: '10px'
  },
  posizione: {
    fontSize: '18px',
    width: '32px',
    textAlign: 'center',
    flexShrink: 0
  },
  infoGiocatore: {
    flex: 1
  },
  nome: {
    fontSize: '15px',
    fontWeight: 600
  },
  dettaglio: {
    fontSize: '12px',
    color: '#8a8578'
  },
  punti: {
    fontSize: '16px',
    fontWeight: 700
  },
  caricamento: {
    fontSize: '14px',
    color: '#8a8578'
  },
  errore: {
    fontSize: '14px',
    color: '#a63d40'
  },
  vuoto: {
    fontSize: '14px',
    color: '#8a8578'
  }
}
