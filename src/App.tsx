import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Player = {
  id: number
  name: string
}

type PersistedState = {
  players: Player[]
  nextId: number
  battingOrder: number[]
  positions: Record<string, number | ''>
}

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LCF', 'RCF', 'RF']
const STORAGE_KEY = 'lineup-lab-state-v1'
const DEFAULT_PLAYERS: Player[] = [
  { id: 1, name: 'Kyla Weir' },
  { id: 2, name: 'Mariah Abreu' },
  { id: 3, name: 'Hazel Miller' },
  { id: 4, name: 'Kasey Montgomery' },
  { id: 5, name: 'Leah Kelly' },
  { id: 6, name: 'Sophia Usner' },
  { id: 7, name: 'Kaylee Osborn' },
  { id: 8, name: 'Emily Salter' },
  { id: 9, name: 'Gwynn Martinez' },
  { id: 10, name: 'Peyton Allison' },
  { id: 11, name: 'Olivia Lausch' },
  { id: 12, name: 'Katelyn Oberholtzer' },
  { id: 13, name: 'Wynter Yarnall' },
  { id: 14, name: 'Abigail Gilmore' },
]
const DEFAULT_BATTING_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const createEmptyPositions = (): Record<string, number | ''> =>
  Object.fromEntries(POSITIONS.map((position) => [position, ''])) as Record<
    string,
    number | ''
  >

const readPersistedState = (): PersistedState | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState>
    if (!Array.isArray(parsed.players) || !Array.isArray(parsed.battingOrder)) {
      return null
    }

    const players = parsed.players
      .filter((player) => typeof player?.id === 'number' && typeof player?.name === 'string')
      .map((player) => ({ id: player.id, name: player.name }))

    if (players.length === 0) {
      return null
    }

    const battingOrder = parsed.battingOrder.filter(
      (playerId): playerId is number => typeof playerId === 'number',
    )

    const positions = createEmptyPositions()
    if (parsed.positions && typeof parsed.positions === 'object') {
      for (const position of POSITIONS) {
        const value = (parsed.positions as Record<string, unknown>)[position]
        positions[position] = typeof value === 'number' ? value : ''
      }
    }

    const maxId = Math.max(...players.map((player) => player.id))
    const nextId =
      typeof parsed.nextId === 'number' && parsed.nextId > maxId
        ? parsed.nextId
        : maxId + 1

    return {
      players,
      nextId,
      battingOrder,
      positions,
    }
  } catch {
    return null
  }
}

const POSITION_COORDS: Record<string, { x: number; y: number }> = {
  P: { x: 50, y: 64 },
  C: { x: 50, y: 84 },
  '1B': { x: 65, y: 70 },
  '2B': { x: 56, y: 56 },
  '3B': { x: 35, y: 70 },
  SS: { x: 44, y: 56 },
  LF: { x: 22, y: 36 },
  LCF: { x: 39, y: 24 },
  RCF: { x: 61, y: 24 },
  RF: { x: 78, y: 36 },
}

function App() {
  const persistedState = readPersistedState()
  const [players, setPlayers] = useState<Player[]>(
    persistedState?.players ?? DEFAULT_PLAYERS,
  )
  const [nextId, setNextId] = useState(persistedState?.nextId ?? 15)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [battingOrder, setBattingOrder] = useState<number[]>(
    persistedState?.battingOrder ?? DEFAULT_BATTING_ORDER,
  )
  const [positions, setPositions] = useState<Record<string, number | ''>>(
    persistedState?.positions ?? createEmptyPositions(),
  )

  useEffect(() => {
    const payload: PersistedState = {
      players,
      nextId,
      battingOrder,
      positions,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [players, nextId, battingOrder, positions])

  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  )

  const playersNotInOrder = players.filter(
    (player) => !battingOrder.includes(player.id),
  )

  const assignmentCounts = Object.values(positions).reduce<Record<number, number>>(
    (acc, playerId) => {
      if (typeof playerId === 'number') {
        acc[playerId] = (acc[playerId] ?? 0) + 1
      }
      return acc
    },
    {},
  )

  const duplicateAssignments = Object.entries(assignmentCounts)
    .filter(([, count]) => count > 1)
    .map(([playerId]) => Number(playerId))

  const addPlayer = () => {
    const trimmed = newPlayerName.trim()
    if (!trimmed) return

    setPlayers((current) => [...current, { id: nextId, name: trimmed }])
    setNextId((current) => current + 1)
    setNewPlayerName('')
  }

  const removePlayer = (id: number) => {
    setPlayers((current) => current.filter((player) => player.id !== id))
    setBattingOrder((current) => current.filter((playerId) => playerId !== id))
    setPositions((current) => {
      const updated = { ...current }
      for (const position of POSITIONS) {
        if (updated[position] === id) {
          updated[position] = ''
        }
      }
      return updated
    })
  }

  const addToBattingOrder = (id: number) => {
    if (battingOrder.includes(id)) return
    setBattingOrder((current) => [...current, id])
  }

  const moveBatter = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= battingOrder.length) return

    setBattingOrder((current) => {
      const updated = [...current]
      const [selected] = updated.splice(index, 1)
      updated.splice(target, 0, selected)
      return updated
    })
  }

  const removeFromBattingOrder = (id: number) => {
    setBattingOrder((current) => current.filter((playerId) => playerId !== id))
  }

  const setPositionPlayer = (position: string, value: string) => {
    setPositions((current) => ({
      ...current,
      [position]: value ? Number(value) : '',
    }))
  }

  const autofillDefense = () => {
    const nextPositions = Object.fromEntries(
      POSITIONS.map((position, index) => [position, battingOrder[index] ?? '']),
    )
    setPositions(nextPositions)
  }

  const clearDefense = () => {
    setPositions(createEmptyPositions())
  }

  const getPlayerPosition = (playerId: number) => {
    const assignedPosition = POSITIONS.find(
      (position) => positions[position] === playerId,
    )
    return assignedPosition ?? 'BENCH'
  }

  const playerLabelForPosition = (position: string) => {
    const playerId = positions[position]
    if (typeof playerId !== 'number') {
      return 'Open'
    }
    return playersById.get(playerId)?.name ?? 'Unknown'
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Softball</p>
        <h1>Lineup Lab</h1>
        <p className="subtitle">
          Build your roster, set batting order, and assign defensive positions in
          one place.
        </p>
      </header>

      <section className="grid two-column">
        <article className="card">
          <h2>Roster</h2>
          <div className="inline-form">
            <input
              type="text"
              value={newPlayerName}
              onChange={(event) => setNewPlayerName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addPlayer()
                }
              }}
              placeholder="Add player name"
              aria-label="Player name"
            />
            <button onClick={addPlayer}>Add</button>
          </div>
          <ul className="list">
            {players.map((player) => (
              <li key={player.id}>
                <span>
                  {player.name} ({getPlayerPosition(player.id)})
                </span>
                <div className="actions">
                  <button onClick={() => addToBattingOrder(player.id)}>
                    Add to order
                  </button>
                  <button
                    className="ghost danger"
                    onClick={() => removePlayer(player.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Batting Order</h2>
          {battingOrder.length === 0 ? (
            <p className="muted">Add players to start your lineup.</p>
          ) : (
            <ol className="list ordered">
              {battingOrder.map((playerId, index) => (
                <li key={playerId}>
                  <span>
                    {index + 1}. {playersById.get(playerId)?.name ?? 'Unknown'} ({getPlayerPosition(playerId)})
                  </span>
                  <div className="actions">
                    <button onClick={() => moveBatter(index, -1)}>Up</button>
                    <button onClick={() => moveBatter(index, 1)}>Down</button>
                    <button
                      className="ghost"
                      onClick={() => removeFromBattingOrder(playerId)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {playersNotInOrder.length > 0 && (
            <p className="muted compact">
              Available: {playersNotInOrder.map((player) => player.name).join(', ')}
            </p>
          )}
        </article>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Defensive Positions</h2>
          <div className="actions">
            <button onClick={autofillDefense}>Auto-fill from order</button>
            <button className="ghost" onClick={clearDefense}>
              Clear
            </button>
          </div>
        </div>
        <div className="position-grid">
          {POSITIONS.map((position) => (
            <label key={position} className="position-cell">
              <span>{position}</span>
              <select
                value={positions[position] === '' ? '' : String(positions[position])}
                onChange={(event) => setPositionPlayer(position, event.target.value)}
              >
                <option value="">Unassigned</option>
                {battingOrder.map((playerId) => (
                  <option key={playerId} value={playerId}>
                    {playersById.get(playerId)?.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {duplicateAssignments.length > 0 && (
          <p className="alert">
            Duplicate assignment: {duplicateAssignments.map((id) => playersById.get(id)?.name).join(', ')}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Field View</h2>
        <div className="field-wrap" aria-label="Defensive field view">
          <div className="field">
            <div className="infield-diamond" />
            <div className="outfield-arc" />
            {POSITIONS.map((position) => (
              <div
                key={position}
                className="position-marker"
                style={{
                  left: `${POSITION_COORDS[position].x}%`,
                  top: `${POSITION_COORDS[position].y}%`,
                }}
              >
                <strong>{position}</strong>
                <span>{playerLabelForPosition(position)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="status-bar">
        <span>Roster: {players.length}</span>
        <span>Batting spots: {battingOrder.length}</span>
        <span>
          Defensive spots filled:{' '}
          {Object.values(positions).filter((value) => typeof value === 'number').length}/{POSITIONS.length}
        </span>
      </footer>
    </main>
  )
}

export default App
