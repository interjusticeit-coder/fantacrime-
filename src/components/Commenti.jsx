import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Commenti({ caso, utente }) {
  const [commenti, setCommenti] = useState([])
  const [testo, setTesto] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviando, setInviando] = useState(false)
  const [error, setError] = useState(null)

  async function carica() {
    if (!caso?.id) return
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('commenti')
        .select('id, nome_utente, testo, created_at')
        .eq('caso_id', caso.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setCommenti(data || [])
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

  async function invia() {
    if (!testo.trim()) return
    setInviando(true)
    setError(null)
    try {
      const { error: insertError } = await supabase.from('commenti').insert({
        caso_id: caso.id,
        nome_utente: utente,
        testo: testo.trim()
      })
      if (insertError) throw insertError

      setTesto('')
      carica()
    } catch (err) {
      setError(err.message)
    } finally {
      setInviando(false)
    }
  }

  if (!caso) return null

  return (
    <div className="card">
      <strong>Teorie e commenti</strong>
      <p style={{ margin: '4px 0 12px', fontSize: 13, color: '#666' }}>
        Scrivi la tua teoria su chi è il colpevole e perché.
      </p>

      <textarea
        rows={2}
        placeholder="Es. Secondo me è stato il giardiniere perché..."
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
      />

      {error && <div className="error">{error}</div>}

      <button className="primary" onClick={invia} disabled={inviando || !testo.trim()}>
        {inviando ? 'Invio...' : 'Pubblica teoria'}
      </button>

      <div style={{ marginTop: 16 }}>
        {loading && <p style={{ color: '#666', fontSize: 14 }}>Caricamento...</p>}
        {!loading && commenti.length === 0 && (
          <p style={{ color: '#666', fontSize: 14 }}>Nessun commento ancora. Sii il primo!</p>
        )}
        {commenti.map((c) => (
          <div key={c.id} style={{ borderTop: '0.5px solid #eee', padding: '10px 0' }}>
            <strong style={{ fontSize: 13 }}>{c.nome_utente}</strong>
            <p style={{ margin: '4px 0 0', fontSize: 14 }}>{c.testo}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
