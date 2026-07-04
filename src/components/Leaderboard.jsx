import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Leaderboard() {
  const [punteggi, setPunteggi] = useState([])

  useEffect(() => {
    async function carica() {
      const { data } = await supabase
        .from('punteggi')
        .select('*')
        .order('punti', { ascending: false })
        .limit(20)
      setPunteggi(data || [])
    }
    carica()
  }, [])

  return (
    <div className="card">
      <h3>Classifica</h3>
      {punteggi.length === 0 && <p style={{ color: '#666', fontSize: 14 }}>Ancora nessun punteggio.</p>}
      {punteggi.map((p) => (
        <div className="leaderboard-row" key={p.utente}>
          <span>{p.utente}</span>
          <span>{p.punti} punti</span>
        </div>
      ))}
    </div>
  )
}
