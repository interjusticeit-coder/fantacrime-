import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function CaseGenerator({ onCasoCreato }) {
  const [loading, setLoading] = useState(false)
  const [caso, setCaso] = useState(null)
  const [error, setError] = useState(null)

  async function generaCaso() {
    setLoading(true)
    setError(null)
    try {
      // Prende gli ultimi 5 casi per evitare ripetizioni
      const { data: precedenti } = await supabase
        .from('casi')
        .select('ambientazione, metodo')
        .order('created_at', { ascending: false })
        .limit(5)

      const res = await fetch('/api/generate-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ casiPrecedenti: precedenti || [] })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore generazione')

      const { data: inserted, error: insertError } = await supabase
        .from('casi')
        .insert({
          ambientazione: data.ambientazione,
          metodo: data.metodo,
          titolo: data.titolo,
          scena: data.scena,
          indizi: data.indizi,
          ruoli: data.ruoli
        })
        .select()
        .single()

      if (insertError) throw insertError

      setCaso(inserted)
      onCasoCreato?.(inserted)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <strong>Il cervellone</strong>
          <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Genera il caso della settimana</p>
        </div>
        <button className="primary" onClick={generaCaso} disabled={loading}>
          {loading ? 'Sto pensando...' : 'Genera caso'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {caso && (
        <div className="card">
          <span className="badge badge-purple">{caso.ambientazione}</span>
          <span className="badge badge-coral">{caso.metodo}</span>
          <h3>{caso.titolo}</h3>
          <p>{caso.scena}</p>
          <strong>Indizi</strong>
          <ul>
            {caso.indizi.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
          <strong>Ruoli da personalizzare</strong>
          <ul>
            {caso.ruoli.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
