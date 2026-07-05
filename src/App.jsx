import { useState } from 'react'
import CaseGenerator from './components/CaseGenerator'
import TeamCreator from './components/TeamCreator'
import TeamsList from './components/TeamsList'
import Leaderboard from './components/Leaderboard'

export default function App() {
  const [tab, setTab] = useState('caso')
  const [casoAttuale, setCasoAttuale] = useState(null)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Fantacrime</h1>
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

      {tab === 'caso' && <CaseGenerator onCasoCreato={setCasoAttuale} />}
      {tab === 'squadra' && <TeamCreator caso={casoAttuale} />}
      {tab === 'squadre' && <TeamsList caso={casoAttuale} />}
      {tab === 'classifica' && <Leaderboard />}
    </div>
  )
}
