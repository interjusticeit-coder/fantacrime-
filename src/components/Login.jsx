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
    <div className="login-screen">
      <div className="login-blob-1"></div>
      <div className="login-blob-2"></div>

      <div className="login-content">
        <div className="login-logo-row">
          <div className="login-logo-box">F</div>
          <div className="login-brand">Fantacrime</div>
        </div>

        <div className="login-headline">Un nuovo caso ti aspetta ogni settimana.</div>
        <div className="login-subline">
          Crea la tua squadra, disseminale indizi e scopri chi indovina il colpevole.
        </div>

        <div className="login-toggle">
          <button
            className={modalita === 'accedi' ? 'active' : ''}
            onClick={() => setModalita('accedi')}
          >
            Accedi
          </button>
          <button
            className={modalita === 'registrati' ? 'active' : ''}
            onClick={() => setModalita('registrati')}
          >
            Registrati
          </button>
        </div>

        <div className="login-field-label">Nome utente</div>
        <input
          placeholder="es. investigatore92"
          value={nomeUtente}
          onChange={(e) => setNomeUtente(e.target.value)}
        />

        <div className="login-field-label">Password</div>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="error">{error}</div>}

        <button
          className="primary"
          style={{ width: '100%', marginTop: 6 }}
          onClick={modalita === 'accedi' ? accedi : registrati}
          disabled={loading}
        >
          {loading ? 'Un attimo...' : modalita === 'accedi' ? 'Accedi' : 'Crea account'}
        </button>

        <div className="login-footnote">Beta interna · per un gruppo di amici</div>
      </div>
    </div>
  )
}
