import { useState } from 'react'
import { supabase } from '../supabaseClient'

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function Login({ onLogin }) {
  const [modalita, setModalita] = useState('accedi') // 'accedi' | 'registrati'
  const [nomeUtente, setNomeUtente] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function accedi() {
    setLoading(true)
    setError(null)
    try {
      const passwordHash = await hashPassword(password)
      const { data, error: fetchError } = await supabase
        .from('utenti')
        .select('nome_utente, password_hash')
        .eq('nome_utente', nomeUtente)
        .maybeSingle()

      if (fetchError) throw fetchError
      if (!data) throw new Error('Utente non trovato.')
      if (data.password_hash !== passwordHash) throw new Error('Password errata.')

      localStorage.setItem('fantacrime_utente', nomeUtente)
      onLogin(nomeUtente)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function registrati() {
    setLoading(true)
    setError(null)
    try {
      if (!nomeUtente || nomeUtente.length < 3) {
        throw new Error('Il nome utente deve avere almeno 3 caratteri.')
      }
      if (!password || password.length < 4) {
        throw new Error('La password deve avere almeno 4 caratteri.')
      }

      const { data: esistente } = await supabase
        .from('utenti')
        .select('nome_utente')
        .eq('nome_utente', nomeUtente)
        .maybeSingle()

      if (esistente) throw new Error('Nome utente già in uso, scegline un altro.')

      const passwordHash = await hashPassword(password)
      const { error: insertError } = await supabase
        .from('utenti')
        .insert({ nome_utente: nomeUtente, password_hash: passwordHash })

      if (insertError) throw insertError

      localStorage.setItem('fantacrime_utente', nomeUtente)
      onLogin(nomeUtente)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 360, margin: '48px auto' }}>
      <h3 style={{ marginTop: 0, textAlign: 'center' }}>Fantacrime</h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={modalita === 'accedi' ? 'primary' : 'secondary'}
          style={{ flex: 1 }}
          onClick={() => setModalita('accedi')}
        >
          Accedi
        </button>
        <button
          className={modalita === 'registrati' ? 'primary' : 'secondary'}
          style={{ flex: 1 }}
          onClick={() => setModalita('registrati')}
        >
          Registrati
        </button>
      </div>

      <label>Nome utente</label>
      <input value={nomeUtente} onChange={(e) => setNomeUtente(e.target.value)} />

      <label>Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      {error && <div className="error">{error}</div>}

      <button
        className="primary"
        style={{ width: '100%' }}
        onClick={modalita === 'accedi' ? accedi : registrati}
        disabled={loading}
      >
        {loading ? 'Un attimo...' : modalita === 'accedi' ? 'Accedi' : 'Crea account'}
      </button>
    </div>
  )
}
