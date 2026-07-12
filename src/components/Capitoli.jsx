import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const TAG_CLASSI = {
  'colpo di scena': 'badge-coral',
  cronaca: 'badge-purple',
  normale: 'badge-purple'
}

export default function Capitoli({ caso, onUltimoCapitolo }) {
  const [capitoli, setCapitoli] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carica() {
      if (!caso?.id) return
      setLoading(true)
      const { data } = await supabase
        .from('capitoli')
        .select('*')
        .eq('caso_id', caso.id)
        .order('numero', { ascending: false })
      setCapitoli(data || [])
      // Comunichiamo al componente padre qual è l'ultimo capitolo
      // (il primo dell'array, dato che ordiniamo per numero decrescente),
      // così altri componenti (es. il voto sul sospettato) sanno a quale
      // round riferirsi.
      onUltimoCapitolo?.(data?.[0] || null)
      setLoading(false)
    }
    carica()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caso?.id])

  if (!caso) return null
  if (loading) return <p style={{ color: '#666', fontSize: 14 }}>Caricamento capitoli...</p>
  if (capitoli.length === 0) return null

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>In onda — Capitoli del caso</h3>
      {capitoli.map((c) => (
        <div className="card" key={c.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Capitolo {c.numero}</strong>
            <span className={`badge ${TAG_CLASSI[c.tag] || 'badge-purple'}`}>{c.tag}</span>
          </div>
          <p>{c.testo}</p>
          {c.eventi_reali?.length > 0 && (
            <p style={{ fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 8 }}>
              Ispirato a: {c.eventi_reali.join(' · ')}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
