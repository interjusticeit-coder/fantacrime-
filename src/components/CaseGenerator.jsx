import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const CASO_VUOTO = {
  ambientazione: '',
  metodo: '',
  titolo: '',
  scena: '',
  indizi: '',
  ruoli: ''
}

export default function CaseGenerator({ onCasoCreato }) {
  const [loading, setLoading] = useState(false)
  const [caso, setCaso] = useState(null)
  const [error, setError] = useState(null)
  const [showManuale, setShowManuale] = useState(false)
  const [form, setForm] = useState(CASO_VUOTO)

  // Carica l'ultimo caso salvato all'avvio, così non si perde ricaricando la pagina
  useEffect(() => {
    async function caricaUltimoCaso() {
      const { data } = await supabase
        .from('casi')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        setCaso(data)
        onCasoCreato?.(data)
      }
    }
    caricaUltimoCaso()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generaCaso() {
    setLoading(true)
    setError(null)
    try {
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

  async function salvaCasoManuale(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Le liste (indizi, ruoli) vengono scritte una per riga nel form
      const indiziArray = form.indizi.split('\n').map(s => s.trim()).filter(Boolean)
      const ruoliArray = form.ruoli.split('\n').map(s => s.trim()).filter(Boolean)

      if (!form.ambientazione || !form.metodo || !form.titolo || !form.scena) {
        throw new Error('Compila tutti i campi obbligatori.')
      }
      if (indiziArray.length === 0) throw new Error('Inserisci almeno un indizio.')
      if (ruoliArray.length === 0) throw new Error('Inserisci almeno un ruolo.')

      const { data: inserted, error: insertError } = await supabase
        .from('casi')
        .insert({
          ambientazione: form.ambientazione,
          metodo: form.metodo,
          titolo: form.titolo,
          scena: form.scena,
          indizi: indiziArray,
          ruoli: ruoliArray
        })
        .select()
        .single()

      if (insertError) throw insertError

      setCaso(inserted)
      onCasoCreato?.(inserted)
      setForm(CASO_VUOTO)
      setShowManuale(false)
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary" onClick={() => setShowManuale(v => !v)}>
            {showManuale ? 'Annulla' : 'Inserisci manualmente'}
          </button>
          <button className="primary" onClick={generaCaso} disabled={loading}>
            {loading ? 'Sto pensando...' : 'Genera caso'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {showManuale && (
        <form className="card" onSubmit={salvaCasoManuale}>
          <strong>Inserisci il caso manualmente</strong>
          <p style={{ margin: '4px 0 12px', fontSize: 13, color: '#666' }}>
            Usa questo modulo finché non hai la chiave Anthropic per la generazione automatica.
          </p>

          <label>Ambientazione</label>
          <input
            type="text"
            placeholder="Es. Villa di campagna"
            value={form.ambientazione}
            onChange={e => setForm({ ...form, ambientazione: e.target.value })}
          />

          <label>Metodo</label>
          <input
            type="text"
            placeholder="Es. Avvelenamento"
            value={form.metodo}
            onChange={e => setForm({ ...form, metodo: e.target.value })}
          />

          <label>Titolo del caso</label>
          <input
            type="text"
            placeholder="Es. Il giardino silenzioso"
            value={form.titolo}
            onChange={e => setForm({ ...form, titolo: e.target.value })}
          />

          <label>Scena del crimine</label>
          <textarea
            rows={4}
            placeholder="Descrivi la scena..."
            value={form.scena}
            onChange={e => setForm({ ...form, scena: e.target.value })}
          />

          <label>Indizi (uno per riga)</label>
          <textarea
            rows={4}
            placeholder={'Un bicchiere rotto in cucina\nUna finestra aperta sul retro'}
            value={form.indizi}
            onChange={e => setForm({ ...form, indizi: e.target.value })}
          />

          <label>Ruoli da personalizzare (uno per riga)</label>
          <textarea
            rows={4}
            placeholder={'Il giardiniere\nLa governante\nL\'ospite misterioso'}
            value={form.ruoli}
            onChange={e => setForm({ ...form, ruoli: e.target.value })}
          />

          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Salvataggio...' : 'Salva caso'}
          </button>
        </form>
      )}

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
