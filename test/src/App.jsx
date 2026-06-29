import { useEffect, useMemo, useState } from 'react'

import {
  getUsersApi,
  createUserApi,
  updateUserApi,
  deleteUserApi,
} from './lib/api'
import { supabase } from './lib/supabase'

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'quizzes', label: 'Quizzes' },
  { key: 'questions', label: 'Questions' },
  { key: 'game_sessions', label: 'Game Sessions' },
  { key: 'player_records', label: 'Player Records' },
  { key: 'player_answers', label: 'Player Answers' },
  { key: 'user_face_images', label: 'User Face Images' },
  { key: 'user_face_embeddings', label: 'User Face Embeddings' },
  { key: 'vision_sessions', label: 'Vision Sessions' },
  { key: 'vision_detection_logs', label: 'Vision Detection Logs' },
]

function App() {
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [users, setUsers] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [questions, setQuestions] = useState([])
  const [gameSessions, setGameSessions] = useState([])
  const [playerRecords, setPlayerRecords] = useState([])
  const [playerAnswers, setPlayerAnswers] = useState([])
  const [userFaceImages, setUserFaceImages] = useState([])
  const [userFaceEmbeddings, setUserFaceEmbeddings] = useState([])
  const [visionSessions, setVisionSessions] = useState([])
  const [visionDetectionLogs, setVisionDetectionLogs] = useState([])

  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [description, setDescription] = useState('')
  const [extraInfo, setExtraInfo] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    nickname: '',
    description: '',
    extra_info: '',
    is_active: true,
  })

  useEffect(() => {
    loadActiveTab()
  }, [activeTab])

  async function loadActiveTab() {
    setLoading(true)
    setErrorMsg('')

    if (activeTab === 'users') await getUsers()
    if (activeTab === 'quizzes') await getQuizzes()
    if (activeTab === 'questions') await getQuestions()
    if (activeTab === 'game_sessions') await getGameSessions()
    if (activeTab === 'player_records') await getPlayerRecords()
    if (activeTab === 'player_answers') await getPlayerAnswers()
    if (activeTab === 'user_face_images') await getUserFaceImages()
    if (activeTab === 'user_face_embeddings') await getUserFaceEmbeddings()
    if (activeTab === 'vision_sessions') await getVisionSessions()
    if (activeTab === 'vision_detection_logs') await getVisionDetectionLogs()

    setLoading(false)
  }

  async function getUsers() {
    try {
      const data = await getUsersApi()
      setUsers(data || [])
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  async function getQuizzes() {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('quiz_id', { ascending: true })

    if (error) return setErrorMsg(error.message)
    setQuizzes(data || [])
  }

  async function getQuestions() {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('question_id', { ascending: true })

    if (error) return setErrorMsg(error.message)
    setQuestions(data || [])
  }

  async function getGameSessions() {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .order('session_id', { ascending: true })

    if (error) return setErrorMsg(error.message)
    setGameSessions(data || [])
  }

  async function getPlayerRecords() {
    const { data, error } = await supabase
      .from('player_records')
      .select('*')
      .order('record_id', { ascending: true })

    if (error) return setErrorMsg(error.message)
    setPlayerRecords(data || [])
  }

  async function getPlayerAnswers() {
    const { data, error } = await supabase
      .from('player_answers')
      .select('*')
      .order('answer_id', { ascending: true })

    if (error) return setErrorMsg(error.message)
    setPlayerAnswers(data || [])
  }

  async function getUserFaceImages() {
    const { data, error } = await supabase
      .from('user_face_images')
      .select('*')
      .order('id', { ascending: true })

    if (error) return setErrorMsg(error.message)
    setUserFaceImages(data || [])
  }

  async function getUserFaceEmbeddings() {
    const { data, error } = await supabase
      .from('user_face_embeddings')
      .select('*')
      .order('id', { ascending: true })

    if (error) return setErrorMsg(error.message)
    setUserFaceEmbeddings(data || [])
  }

  async function getVisionSessions() {
    const { data, error } = await supabase
      .from('vision_sessions')
      .select('*')
      .order('id', { ascending: true })

    if (error) return setErrorMsg(error.message)
    setVisionSessions(data || [])
  }

  async function getVisionDetectionLogs() {
    const { data, error } = await supabase
      .from('vision_detection_logs')
      .select('*')
      .order('id', { ascending: true })

    if (error) return setErrorMsg(error.message)
    setVisionDetectionLogs(data || [])
  }

  async function addUser(e) {
    e.preventDefault()

    try {
      await createUserApi({
        name,
        nickname,
        description,
        extra_info: extraInfo,
        is_active: isActive,
        face_embedding: [0.1],
        avatar_url: '',
      })

      setName('')
      setNickname('')
      setDescription('')
      setExtraInfo('')
      setIsActive(true)
      await getUsers()
    } catch (err) {
      alert('新增失敗：' + err.message)
    }
  }

  function startEdit(user) {
    setEditingId(user.id)
    setEditForm({
      name: user.name || '',
      nickname: user.nickname || '',
      description: user.description || '',
      extra_info: user.extra_info || '',
      is_active: !!user.is_active,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({
      name: '',
      nickname: '',
      description: '',
      extra_info: '',
      is_active: true,
    })
  }

  async function saveEdit(id) {
    try {
      await updateUserApi(id, {
        name: editForm.name,
        nickname: editForm.nickname,
        description: editForm.description,
        extra_info: editForm.extra_info,
        is_active: editForm.is_active,
      })

      cancelEdit()
      await getUsers()
    } catch (err) {
      alert('更新失敗：' + err.message)
    }
  }

  async function deleteUser(id) {
    const ok = window.confirm('確定要刪除這筆使用者資料嗎？')
    if (!ok) return

    try {
      await deleteUserApi(id)
      await getUsers()
    } catch (err) {
      alert('刪除失敗：' + err.message)
    }
  }

  function formatValue(value) {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (Array.isArray(value)) {
      if (value.length > 8) return `[${value.length} items]`
      return JSON.stringify(value)
    }
    if (typeof value === 'object') return JSON.stringify(value)
    const text = String(value)
    if (text.startsWith('data:image/')) return '[base64 image]'
    if (text.length > 80) return text.slice(0, 80) + '...'
    return text
  }

  function renderReadOnlyTable(rows) {
    if (!rows.length) return <p>目前沒有資料。</p>

    const columns = Object.keys(rows[0])

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} style={styles.th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {columns.map((col) => (
                  <td key={col} style={styles.td}>
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const pageTitle = useMemo(() => {
    const found = TABS.find((tab) => tab.key === activeTab)
    return found ? found.label : 'Admin'
  }, [activeTab])

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Admin Panel</h2>

        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.navButton,
              ...(activeTab === tab.key ? styles.navButtonActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </aside>

      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{pageTitle}</h1>
            {/* <p style={styles.subtitle}>
              顯示所有只有 users 開放編輯。
            </p> */}
          </div>

          <button onClick={loadActiveTab} style={styles.refreshButton}>
            重新整理
          </button>
        </div>

        {loading && <p>讀取中...</p>}
        {errorMsg && <p style={styles.errorText}>錯誤：{errorMsg}</p>}

        {!loading && activeTab === 'users' && (
          <>
            <section style={styles.card}>
              <h3 style={styles.sectionTitle}>使用者資料</h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>id</th>
                      <th style={styles.th}>name</th>
                      <th style={styles.th}>nickname</th>
                      <th style={styles.th}>description</th>
                      <th style={styles.th}>extra_info</th>
                      <th style={styles.th}>is_active</th>
                      <th style={styles.th}>created_at</th>
                      <th style={styles.th}>updated_at</th>
                      <th style={styles.th}>face_embedding</th>
                      <th style={styles.th}>avatar_url</th>
                      <th style={styles.th}>actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td style={styles.td}>{user.id}</td>

                        <td style={styles.td}>
                          {editingId === user.id ? (
                            <input
                              style={styles.input}
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                          ) : formatValue(user.name)}
                        </td>

                        <td style={styles.td}>
                          {editingId === user.id ? (
                            <input
                              style={styles.input}
                              value={editForm.nickname}
                              onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                            />
                          ) : formatValue(user.nickname)}
                        </td>

                        <td style={styles.td}>
                          {editingId === user.id ? (
                            <input
                              style={styles.input}
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                          ) : formatValue(user.description)}
                        </td>

                        <td style={styles.td}>
                          {editingId === user.id ? (
                            <input
                              style={styles.input}
                              value={editForm.extra_info}
                              onChange={(e) => setEditForm({ ...editForm, extra_info: e.target.value })}
                            />
                          ) : formatValue(user.extra_info)}
                        </td>

                        <td style={styles.td}>
                          {editingId === user.id ? (
                            <label style={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={editForm.is_active}
                                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                              />
                              active
                            </label>
                          ) : user.is_active ? 'true' : 'false'}
                        </td>

                        <td style={styles.td}>{formatValue(user.created_at)}</td>
                        <td style={styles.td}>{formatValue(user.updated_at)}</td>
                        <td style={styles.td}>
                          {Array.isArray(user.face_embedding)
                            ? `[${user.face_embedding.length} items]`
                            : '—'}
                        </td>
                        <td style={styles.td}>
                          {user.avatar_url ? (
                            <a href={user.avatar_url} target="_blank" rel="noreferrer" style={styles.link}>
                              查看
                            </a>
                          ) : '—'}
                        </td>

                        <td style={styles.td}>
                          {editingId === user.id ? (
                            <div style={styles.actionGroup}>
                              <button onClick={() => saveEdit(user.id)} style={styles.smallPrimaryButton}>
                                儲存
                              </button>
                              <button onClick={cancelEdit} style={styles.smallButton}>
                                取消
                              </button>
                            </div>
                          ) : (
                            <div style={styles.actionGroup}>
                              <button onClick={() => startEdit(user)} style={styles.smallButton}>
                                編輯
                              </button>
                              <button onClick={() => deleteUser(user.id)} style={styles.smallDangerButton}>
                                刪除
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {!loading && activeTab === 'quizzes' && <section style={styles.card}><h3 style={styles.sectionTitle}>Quizzes（只讀）</h3>{renderReadOnlyTable(quizzes)}</section>}
        {!loading && activeTab === 'questions' && <section style={styles.card}><h3 style={styles.sectionTitle}>Questions（只讀）</h3>{renderReadOnlyTable(questions)}</section>}
        {!loading && activeTab === 'game_sessions' && <section style={styles.card}><h3 style={styles.sectionTitle}>Game Sessions（只讀）</h3>{renderReadOnlyTable(gameSessions)}</section>}
        {!loading && activeTab === 'player_records' && <section style={styles.card}><h3 style={styles.sectionTitle}>Player Records（只讀）</h3>{renderReadOnlyTable(playerRecords)}</section>}
        {!loading && activeTab === 'player_answers' && <section style={styles.card}><h3 style={styles.sectionTitle}>Player Answers（只讀）</h3>{renderReadOnlyTable(playerAnswers)}</section>}
        {!loading && activeTab === 'user_face_images' && <section style={styles.card}><h3 style={styles.sectionTitle}>User Face Images（只讀）</h3>{renderReadOnlyTable(userFaceImages)}</section>}
        {!loading && activeTab === 'user_face_embeddings' && <section style={styles.card}><h3 style={styles.sectionTitle}>User Face Embeddings（只讀）</h3>{renderReadOnlyTable(userFaceEmbeddings)}</section>}
        {!loading && activeTab === 'vision_sessions' && <section style={styles.card}><h3 style={styles.sectionTitle}>Vision Sessions（只讀）</h3>{renderReadOnlyTable(visionSessions)}</section>}
        {!loading && activeTab === 'vision_detection_logs' && <section style={styles.card}><h3 style={styles.sectionTitle}>Vision Detection Logs（只讀）</h3>{renderReadOnlyTable(visionDetectionLogs)}</section>}
      </main>
    </div>
  )
}

const styles = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    height: '100vh',
    background: '#0b1020',
    color: '#e5e7eb',
    fontFamily: 'Arial, sans-serif',
    overflow: 'hidden',
  },

  sidebar: {
    width: '280px',
    minWidth: '280px',
    maxWidth: '280px',
    padding: '24px 16px',
    borderRight: '1px solid #1f2937',
    background: '#111827',
    overflowY: 'auto',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    flexShrink: 0,
  },

  sidebarTitle: {
    marginTop: 0,
    marginBottom: '24px',
    fontSize: '22px',
    lineHeight: 1.2,
    wordBreak: 'break-word',
  },

  navButton: {
    display: 'block',
    width: '100%',
    marginBottom: '10px',
    padding: '12px 14px',
    textAlign: 'left',
    background: '#1f2937',
    color: '#e5e7eb',
    border: '1px solid #374151',
    borderRadius: '10px',
    cursor: 'pointer',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.4,
  },

  navButtonActive: {
    background: '#2563eb',
    border: '1px solid #3b82f6',
  },

  main: {
    flex: 1,
    minWidth: 0,
    padding: '24px',
    overflowX: 'auto',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },

  title: {
    margin: 0,
    fontSize: '32px',
    lineHeight: 1.2,
  },

  subtitle: {
    marginTop: '8px',
    color: '#9ca3af',
    lineHeight: 1.5,
  },

  refreshButton: {
    padding: '10px 14px',
    background: '#374151',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    flexShrink: 0,
  },

  card: {
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '24px',
    overflow: 'hidden',
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: '16px',
    lineHeight: 1.3,
  },

  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    alignItems: 'center',
  },

  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #374151',
    background: '#0f172a',
    color: '#fff',
    boxSizing: 'border-box',
    minWidth: 0,
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  },

  primaryButton: {
    padding: '10px 14px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  smallPrimaryButton: {
    padding: '8px 10px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  smallButton: {
    padding: '8px 10px',
    background: '#374151',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  smallDangerButton: {
    padding: '8px 10px',
    background: '#b91c1c',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  actionGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },

  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    borderRadius: '12px',
  },

  table: {
    width: 'max-content',
    minWidth: '100%',
    borderCollapse: 'collapse',
  },

  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '1px solid #374151',
    background: '#0f172a',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },

  td: {
    padding: '12px',
    borderBottom: '1px solid #1f2937',
    verticalAlign: 'top',
    fontSize: '14px',
    lineHeight: 1.5,
    wordBreak: 'break-word',
    maxWidth: '220px',
  },

  errorText: {
    color: '#f87171',
    lineHeight: 1.5,
  },

  link: {
    color: '#60a5fa',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
}

export default App