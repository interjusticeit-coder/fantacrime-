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
  const [opzioni, setOpzioni] = useState(null)
  const [scegliendo, setScegliendo] = useState(false)
  const [generandoEvento, setGenerandoEvento] = useState(false)
  const [eventoMsg, setEventoMsg] = useState(null)

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

  async function generaOpzioni() {
    setLoading(true)
    setError(null)
    setOpzioni(null)
    try {
      const { data: precedenti } = await supabase
        .from('casi')
        .select('ambientazione, metodo')
        .order('created_at', { ascending: false })
        .limit(5)

      const res = await fetch('/api/generate-case-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ casiPrecedenti: precedenti || [] })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore generazione')

      setOpzioni(data.opzioni || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function scegliOpzione(opzione) {
    setScegliendo(true)
    setError(null)
    try {
      const { data: inserted, error: insertError } = await supabase
        .from('casi')
        .insert({
          ambientazione: opzione.ambientazione,
          metodo: opzione.metodo,
          titolo: opzione.titolo,
          scena: opzione.scena,
          indizi: opzione.indizi,
          ruoli: opzione.ruoli
        })
        .select()
        .single()

      if (insertError) throw insertError

      setCaso(inserted)
      onCasoCreato?.(inserted)
      setOpzioni(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setScegliendo(false)
    }
  }

  async function salvaCasoManuale(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const indiziArray = form.indizi.split('\n').map((s) => s.trim()).filter(Boolean)
      const ruoliArray = form.ruoli.split('\n').map((s) => s.trim()).filter(Boolean)

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

  async function aggiungiEvento() {
    setGenerandoEvento(true)
    setEventoMsg(null)
    setError(null)
    try {
      const res = await fetch('/api/evolvi-capitolo', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore generando l\'evento')

      if (data.skipped) {
        setEventoMsg(data.motivo || 'Nessun nuovo evento generato.')
      } else {
        setEventoMsg('Nuovo capitolo pubblicato! Ricarica per vederlo.')
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerandoEvento(false)
    }
  }

  return (
    <div>
      {!caso && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <strong>Il cervellone</strong>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--soft)' }}>Genera il caso della settimana</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="secondary" onClick={() => setShowManuale((v) => !v)}>
              {showManuale ? 'Annulla' : 'Inserisci manualmente'}
            </button>
            <button className="primary" onClick={generaOpzioni} disabled={loading}>
              {loading ? 'Sto pensando...' : 'Genera 3 opzioni'}
            </button>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {opzioni && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--soft)', marginBottom: 12 }}>
            Scegli il caso che diventerà quello ufficiale della settimana:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {opzioni.map((op, idx) => (
              <div className="card" key={idx}>
                <span className="badge badge-purple">{op.ambientazione}</span>
                <span className="badge badge-coral">{op.metodo}</span>
                <h3 style={{ marginBottom: 4 }}>{op.titolo}</h3>
                <p style={{ fontSize: 13.5 }}>{op.scena}</p>
                <button
                  className="primary"
                  style={{ width: '100%' }}
                  onClick={() => scegliOpzione(op)}
                  disabled={scegliendo}
                >
                  {scegliendo ? 'Salvataggio...' : 'Scegli questo caso'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showManuale && (
        <form className="card" onSubmit={salvaCasoManuale}>
          <strong>Inserisci il caso manualmente</strong>
          <p style={{ margin: '4px 0 12px', fontSize: 13, color: 'var(--soft)' }}>
            Utile se preferisci scrivere tu il caso invece di generarlo.
          </p>

          <label>Ambientazione</label>
          <input
            type="text"
            placeholder="Es. Villa di campagna"
            value={form.ambientazione}
            onChange={(e) => setForm({ ...form, ambientazione: e.target.value })}
          />

          <label>Metodo</label>
          <input
            type="text"
            placeholder="Es. Avvelenamento"
            value={form.metodo}
            onChange={(e) => setForm({ ...form, metodo: e.target.value })}
          />

          <label>Titolo del caso</label>
          <input
            type="text"
            placeholder="Es. Il giardino silenzioso"
            value={form.titolo}
            onChange={(e) => setForm({ ...form, titolo: e.target.value })}
          />

          <label>Scena del crimine</label>
          <textarea
            rows={4}
            placeholder="Descrivi la scena..."
            value={form.scena}
            onChange={(e) => setForm({ ...form, scena: e.target.value })}
          />

          <label>Indizi (uno per riga)</label>
          <textarea
            rows={4}
            placeholder={'Un bicchiere rotto in cucina\nUna finestra aperta sul retro'}
            value={form.indizi}
            onChange={(e) => setForm({ ...form, indizi: e.target.value })}
          />

          <label>Ruoli da personalizzare (uno per riga)</label>
          <textarea
            rows={4}
            placeholder={'Il giardiniere\nLa governante\nL\'ospite misterioso'}
            value={form.ruoli}
            onChange={(e) => setForm({ ...form, ruoli: e.target.value })}
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

      {caso && (
        <div style={{ marginTop: 4 }}>
          <button className="secondary" style={{ width: '100%' }} onClick={aggiungiEvento} disabled={generandoEvento}>
            {generandoEvento ? 'Il cervellone sta scrivendo...' : 'Aggiungi evento settimanale'}
          </button>
          {eventoMsg && (
            <p style={{ fontSize: 13, color: 'var(--soft)', marginTop: 8, textAlign: 'center' }}>{eventoMsg}</p>
          )}
        </div>
      )}
    </div>
  )
}
