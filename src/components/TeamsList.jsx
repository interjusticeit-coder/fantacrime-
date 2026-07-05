import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function EditForm({ squadra, onSalvato, onAnnulla }) {
  const [nomeUtente, setNomeUtente] = useState(squadra.nome_utente)
  const [personaggi, setPersonaggi] = useState(squadra.personaggi || [])
  const [colpevole, setColpevole] = useState(squadra.colpevole || '')
  const [movente, setMovente] = useState(squadra.movente || '')
  const [indiziText, setIndiziText] = useState((squadra.indizi_disseminati || []).join('\n'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function aggiornaPersonaggio(idx, campo, valore) {
    setPersonaggi((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [campo]: valore } : p))
    )
  }

  async function salva() {
    setSaving(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('squadre')
        .update({
          nome_utente: nomeUtente,
          personaggi,
          colpevole,
          movente,
          indizi_disseminati: indiziText.split('\n').map((s) => s.trim()).filter(Boolean)
        })
        .eq('id', squadra.id)

      if (updateError) throw updateError
      onSalvato()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Modifica squadra</h3>

      <label>Nome utente</label>
      <input value={nomeUtente} onChange={(e) => setNomeUtente(e.target.value)} />

      {personaggi.map((p, idx) => (
        <div key={idx} style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: 13 }}>{p.ruolo}</strong>
          <input
            placeholder="Nome del personaggio"
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

      <label>Colpevole segreto</label>
      <input value={colpevole} onChange={(e) => setColpevole(e.target.value)} />

      <label>Movente</label>
      <textarea rows={2} value={movente} onChange={(e) => setMovente(e.target.value)} />

      <label>Indizi disseminati (uno per riga)</label>
      <textarea rows={3} value={indiziText} onChange={(e) => setIndiziText(e.target.value)} />

      {error && <div className="error">{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="primary" onClick={salva} disabled={saving}>
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
        <button className="secondary" onClick={onAnnulla} disabled={saving}>
          Annulla
        </button>
      </div>
    </div>
  )
}

export default function TeamsList({ caso }) {
  const [squadre, setSquadre] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modificaId, setModificaId] = useState(null)

  async function carica() {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('squadre')
        .select('id, nome_utente, personaggi, colpevole, movente, indizi_disseminati, created_at')
        .order('created_at', { ascending: false })

      if (caso?.id) {
        query = query.eq('caso_id', caso.id)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      setSquadre(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carica()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caso?.id])

  async function elimina(id) {
    if (!window.confirm('Eliminare questa squadra? L\'azione non è reversibile.')) return
    try {
      const { error: deleteError } = await supabase.from('squadre').delete().eq('id', id)
      if (deleteError) throw deleteError
      setSquadre((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      alert('Errore durante l\'eliminazione: ' + err.message)
    }
  }

  return (
    <div>
      <div className="card">
        <strong>Squadre pubblicate</strong>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
          Modalità beta: chiunque può modificare o eliminare una squadra da qui.
        </p>
      </div>

      {loading && <p style={{ color: '#666', fontSize: 14 }}>Caricamento...</p>}
      {error && <div className="error">{error}</div>}

      {!loading && squadre.length === 0 && (
        <p style={{ color: '#666', fontSize: 14 }}>Nessuna squadra pubblicata ancora.</p>
      )}

      {squadre.map((s) =>
        modificaId === s.id ? (
          <EditForm
            key={s.id}
            squadra={s}
            onAnnulla={() => setModificaId(null)}
            onSalvato={() => {
              setModificaId(null)
              carica()
            }}
          />
        ) : (
          <div className="card" key={s.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ marginTop: 0 }}>{s.nome_utente}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="secondary" onClick={() => setModificaId(s.id)}>
                  Modifica
                </button>
                <button className="secondary" onClick={() => elimina(s.id)}>
                  Elimina
                </button>
              </div>
            </div>

            <strong>Personaggi</strong>
            <ul>
              {(s.personaggi || []).map((p, idx) => (
                <li key={idx}>
                  <strong>{p.ruolo}:</strong> {p.nome} — {p.descrizione}
                </li>
              ))}
            </ul>

            <strong>Colpevole segreto</strong>
            <p>{s.colpevole}</p>

            <strong>Movente</strong>
            <p>{s.movente}</p>

            <strong>Indizi disseminati</strong>
            <ul>
              {(s.indizi_disseminati || []).map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  )
}
