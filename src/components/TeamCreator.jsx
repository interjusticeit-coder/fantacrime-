import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function TeamCreator({ caso, utente }) {
  const [nomeUtente] = useState(utente || '')
  const [personaggi, setPersonaggi] = useState(
    (caso?.ruoli || []).map((ruolo) => ({ ruolo, nome: '', descrizione: '' }))
  )
  const [colpevole, setColpevole] = useState('')
  const [movente, setMovente] = useState('')
  const [indiziText, setIndiziText] = useState('')
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  function aggiornaPersonaggio(idx, campo, valore) {
    setPersonaggi((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [campo]: valore } : p))
    )
  }

  async function invia() {
    setError(null)
    if (!nomeUtente || !colpevole || !movente) {
      setError('Compila colpevole e movente.')
      return
    }

    const testoCompleto = [
      ...personaggi.map((p) => `${p.ruolo}: ${p.nome} - ${p.descrizione}`),
      `Movente: ${movente}`,
      `Indizi disseminati: ${indiziText}`
    ].join('\n')

    setStatus('checking')
    try {
      let mod = { approvato: true }
      try {
        const modRes = await fetch('/api/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testo: testoCompleto })
        })
        if (modRes.ok) {
          mod = await modRes.json()
        }
      } catch {
        // rete/funzione non disponibile: procediamo senza bloccare
      }

      if (mod.approvato === false) {
        setStatus('blocked')
        setError(mod.motivo || 'Contenuto non approvato.')
        return
      }

      const { error: insertError } = await supabase.from('squadre').insert({
        nome_utente: nomeUtente,
        caso_id: caso.id,
        personaggi,
        colpevole,
        movente,
        indizi_disseminati: indiziText.split('\n').filter(Boolean),
        approvato: true
      })
      if (insertError) throw insertError

      setStatus('saved')
    } catch (err) {
      setError(err.message)
      setStatus(null)
    }
  }

  if (!caso) {
    return <p style={{ color: '#666' }}>Genera prima un caso per poter creare la tua squadra.</p>
  }

  return (
    <div className="card">
      <h3>Crea la tua squadra per: {caso.titolo}</h3>
      <p style={{ fontSize: 13, color: '#666', marginTop: -8 }}>
        Stai creando come <strong>{nomeUtente}</strong>
      </p>

      {personaggi.map((p, idx) => (
        <div key={idx} style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: 13 }}>{p.ruolo}</strong>
          <input
            placeholder="Nome del personaggio (di fantasia)"
            value={p.nome}
            onChange={(e) => aggiornaPersonaggio(idx, 'nome', e.target.value)}
          />
          <textarea
            placeholder="Breve descrizione"
            rows={2}
            value={p.descrizione}
            onChange={(e) => aggiornaPersonaggio(idx, 'descrizione', e.target.value)}
          />
        </div>
      ))}

      <label style={{ fontSize: 13, fontWeight: 500 }}>Colpevole segreto (nome di uno dei personaggi sopra)</label>
      <input value={colpevole} onChange={(e) => setColpevole(e.target.value)} />

      <label style={{ fontSize: 13, fontWeight: 500 }}>Movente</label>
      <textarea rows={2} value={movente} onChange={(e) => setMovente(e.target.value)} />

      <label style={{ fontSize: 13, fontWeight: 500 }}>Indizi che disseminerai per gli altri giocatori (uno per riga)</label>
      <textarea rows={3} value={indiziText} onChange={(e) => setIndiziText(e.target.value)} />

      {error && <div className="error">{error}</div>}

      <button className="primary" onClick={invia} disabled={status === 'checking'}>
        {status === 'checking' ? 'Controllo in corso...' : 'Pubblica la mia squadra'}
      </button>

      {status === 'saved' && <p style={{ color: 'green', fontSize: 13 }}>Squadra pubblicata!</p>}
    </div>
  )
}
