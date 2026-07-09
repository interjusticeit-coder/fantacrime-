import { useState, useEffect } from 'react'
import Login from './components/Login'
import CaseGenerator from './components/CaseGenerator'
import TeamCreator from './components/TeamCreator'
import TeamsList from './components/TeamsList'
import Leaderboard from './components/Leaderboard'

export default function App() {
  const [utente, setUtente] = useState(null)
  const [tab, setTab] = useState('caso')
  const [casoAttuale, setCasoAttuale] = useState(null)

  useEffect(() => {
    const salvato = localStorage.getItem('fantacrime_utente')
    if (salvato) setUtente(salvato)
  }, [])

  function esci() {
    localStorage.removeItem('fantacrime_utente')
    setUtente(null)
  }

  if (!utente) {
    return <Login onLogin={setUtente} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Fantacrime</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: '#666' }}>{utente}</span>
          <button className="secondary" onClick={esci}>Esci</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === 'caso' ? 'active' : ''} onClick={() => setTab('caso')}>
          Caso della settimana
        </button>
        <button className={tab === 'squadra' ? 'active' : ''} onClick={() => setTab('squadra')}>
          Crea squadra
        </button>
        <button className={tab === 'squadre' ? 'active' : ''} onClick={() => setTab('squadre')}>
          Squadre
        </button>
        <button className={tab === 'classifica' ? 'active' : ''} onClick={() => setTab('classifica')}>
          Classifica
        </button>
      </nav>

      {tab === 'caso' && <CaseGenerator onCasoCreato={setCasoAttuale} utente={utente} />}
      {tab === 'squadra' && <TeamCreator caso={casoAttuale} utente={utente} />}
      {tab === 'squadre' && <TeamsList caso={casoAttuale} />}
      {tab === 'classifica' && <Leaderboard />}
    </div>
  )
}
