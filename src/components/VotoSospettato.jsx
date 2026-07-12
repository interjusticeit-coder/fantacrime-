import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Componente "VotoSospettato" per Fantacrime.
// Mostra i ruoli del caso corrente (da casi.ruoli) come opzioni tra cui
// scegliere. Ogni giocatore può votare una volta per capitolo (vincolo
// unique su caso_id + nome_utente + numero_capitolo lato DB).

export default function VotoSospettato({ caso, utente, numeroCapitolo }) {
  const [votoEsistente, setVotoEsistente] = useState(null)
  const [ruoloSelezionato, setRuoloSelezionato] = useState('')
  const [caricamento, setCaricamento] = useState(true)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    if (!caso || !utente || !numeroCapitolo) {
      setCaricamento(false)
      return
    }

    let cancellato = false

    async function caricaVotoEsistente() {
      setCaricamento(true)
      const { data, error } = await supabase
        .from('voti')
        .select('ruolo_scelto')
        .eq('caso_id', caso.id)
        .eq('nome_utente', utente)
        .eq('numero_capitolo', numeroCapitolo)
        .maybeSingle()

      if (cancellato) return
      if (error) {
        setErrore(error.message)
      } else if (data) {
        setVotoEsistente(data.ruolo_scelto)
      } else {
        setVotoEsistente(null)
      }
      setCaricamento(false)
    }

    caricaVotoEsistente()
    return () => {
      cancellato = true
    }
  }, [caso, utente, numeroCapitolo])

  async function inviaVoto() {
    if (!ruoloSelezionato) return
    setInvio(true)
    setErrore(null)

    const { error } = await supabase.from('voti').insert({
      caso_id: caso.id,
      nome_utente: utente,
      ruolo_scelto: ruoloSelezionato,
      numero_capitolo: numeroCapitolo
    })

    setInvio(false)
    if (error) {
      if (error.code === '23505') {
        setErrore('Hai già votato per questo capitolo.')
      } else {
        setErrore(error.message)
      }
      return
    }

    setVotoEsistente(ruoloSelezionato)
  }

  if (!caso || !numeroCapitolo) return null
  if (caricamento) return <div className="card">Carico il voto…</div>

  const ruoli = caso.ruoli || []

  if (votoEsistente) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Il tuo voto</h3>
        <p style={{ fontSize: 14 }}>
          Hai votato <strong>{votoEsistente}</strong> per questo capitolo.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Chi è il colpevole secondo te?</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {ruoli.map((ruolo) => (
          <button
            key={ruolo}
            type="button"
            className={ruoloSelezionato === ruolo ? 'primary' : 'secondary'}
            style={{ textAlign: 'left' }}
            onClick={() => setRuoloSelezionato(ruolo)}
          >
            {ruolo}
          </button>
        ))}
      </div>
      {errore && <div className="error">{errore}</div>}
      <button
        className="primary"
        style={{ width: '100%' }}
        onClick={inviaVoto}
        disabled={!ruoloSelezionato || invio}
      >
        {invio ? 'Invio…' : 'Vota'}
      </button>
    </div>
  )
}
