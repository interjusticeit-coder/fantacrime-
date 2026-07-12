import { useState, useEffect } from 'react'
import Login from './components/Login'
import CaseGenerator from './components/CaseGenerator'
import Commenti from './components/Commenti'
import Capitoli from './components/Capitoli'
import Leaderboard from './components/Leaderboard'
import OnAir from './components/OnAir'
import VotoSospettato from './components/VotoSospettato'

function initials(name) {
  if (!name) return '?'
  return name.trim().slice(0, 2).toUpperCase()
}

export default function App() {
  const [utente, setUtente] = useState(null)
  const [tab, setTab] = useState('caso')
  const [casoAttuale, setCasoAttuale] = useState(null)
  const [ultimoCapitolo, setUltimoCapitolo] = useState(null)

  useEffect(() => {
    const salvato = localStorage.getItem('fantacrime_utente')
    if (salvato) setUtente(salvato)
  }, [])

  function esci() {
    localStorage.removeItem('fantacrime_utente')
    setUtente(null)
  }

  if (!utente) {
    return (
      <div className="phone-shell">
        <div className="phone-card">
          <Login onLogin={setUtente} />
        </div>
      </div>
    )
  }

  const navItems = [
    { key: 'caso', label: 'Caso' },
    { key: 'classifica', label: 'Classifica' },
    { key: 'onda', label: 'In onda' }
  ]

  return (
    <div className="phone-shell">
      <div className="phone-card">
        <div className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="app-logo">F</div>
            <h1>Fantacrime</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--soft)', fontWeight: 500 }}>{utente}</span>
            <div className="avatar-circle" onClick={esci} title="Esci">
              {initials(utente)}
            </div>
          </div>
        </div>

        <div className="app-content">
          {tab === 'caso' && (
            <>
              <CaseGenerator onCasoCreato={setCasoAttuale} utente={utente} />
              <Capitoli caso={casoAttuale} onUltimoCapitolo={setUltimoCapitolo} />
              <VotoSospettato
                caso={casoAttuale}
                utente={utente}
                numeroCapitolo={ultimoCapitolo?.numero}
              />
              <Commenti caso={casoAttuale} utente={utente} />
            </>
          )}
          {tab === 'classifica' && <Leaderboard />}
          {tab === 'onda' && <OnAir caso={casoAttuale} />}
        </div>

        <nav className="tabs">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={tab === item.key ? 'active' : ''}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
