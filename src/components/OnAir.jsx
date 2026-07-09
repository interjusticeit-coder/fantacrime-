import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function OnAir({ caso }) {
  const [ultimoCapitolo, setUltimoCapitolo] = useState(null)
  const [top5, setTop5] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carica() {
      setLoading(true)

      if (caso?.id) {
        const { data: capitolo } = await supabase
          .from('capitoli')
          .select('*')
          .eq('caso_id', caso.id)
          .order('numero', { ascending: false })
          .limit(1)
          .maybeSingle()
        setUltimoCapitolo(capitolo)
      }

      const { data: punteggi } = await supabase
        .from('punteggi')
        .select('utente, punti')
        .order('punti', { ascending: false })
        .limit(5)
      setTop5(punteggi || [])

      setLoading(false)
    }
    carica()
  }, [caso?.id])

  if (loading) return <p style={{ color: 'var(--soft)', fontSize: 14 }}>Caricamento...</p>

  return (
    <div>
      {ultimoCapitolo ? (
        <div className="onair-hero">
          <div className="onair-hero-top">
            <div className="onair-brand">TG FANTACRIME</div>
            <div className="onair-live">
              <div className="onair-live-dot"></div>
              <div className="onair-live-label">In onda ora</div>
            </div>
          </div>
          <div className="onair-meta">
            Capitolo {ultimoCapitolo.numero} · {new Date(ultimoCapitolo.created_at).toLocaleDateString('it-IT', { weekday: 'long' })}
          </div>
          <div className="onair-title">{caso?.titolo}</div>
          <div className="onair-text">{ultimoCapitolo.testo}</div>
          <span className="badge badge-coral">{ultimoCapitolo.tag}</span>
        </div>
      ) : (
        <div className="card">
          <p style={{ margin: 0, color: 'var(--soft)', fontSize: 14 }}>
            Nessun capitolo ancora. Il cervellone entrerà in onda al prossimo aggiornamento.
          </p>
        </div>
      )}

      <h3 style={{ marginBottom: 10 }}>Classifica aggiornata</h3>
      {top5.length === 0 && (
        <p style={{ color: 'var(--soft)', fontSize: 14 }}>Ancora nessun punteggio registrato.</p>
      )}
      {top5.map((entry, idx) => (
        <div className="leaderboard-row" key={entry.utente}>
          <div style={{ width: 20, fontFamily: 'Archivo, sans-serif', fontWeight: 800, color: idx === 0 ? 'var(--purple-text)' : 'var(--muted)' }}>
            {idx + 1}
          </div>
          <div style={{ flex: 1, fontWeight: 700 }}>{entry.utente}</div>
          <div style={{ fontWeight: 800, fontFamily: 'Archivo, sans-serif' }}>
            {entry.punti} <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)' }}>pt</span>
          </div>
        </div>
      ))}
    </div>
  )
}
