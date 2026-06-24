import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebase/config'
import { collection, getDocs, query, where } from 'firebase/firestore'

export default function Categoria() {
  const { nome } = useParams()
  const navigate = useNavigate()
  const nomeDecoded = decodeURIComponent(nome)

  const [artigos, setArtigos] = useState([])
  const [loading, setLoading] = useState(true)
  const [pesquisa, setPesquisa] = useState('')
  const [subAtiva, setSubAtiva] = useState('Todos')

  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, 'artigos'), where('cat', '==', nomeDecoded))
        const snap = await getDocs(q)
        setArtigos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [nomeDecoded])

  const subs = ['Todos', ...new Set(artigos.map(a => a.sub).filter(Boolean))]

  const filtrados = artigos.filter(a => {
    const matchSub = subAtiva === 'Todos' || a.sub === subAtiva
    const matchPesquisa = !pesquisa ||
      a.desc?.toLowerCase().includes(pesquisa.toLowerCase()) ||
      a.ref?.toLowerCase().includes(pesquisa.toLowerCase()) ||
      a.supplier?.toLowerCase().includes(pesquisa.toLowerCase())
    return matchSub && matchPesquisa
  })

  return (
    <div style={{ padding: '1.5rem 1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/biblioteca')}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '13px',
            padding: '0 0.75rem',
            height: '32px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          ← Biblioteca
        </button>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{nomeDecoded}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)' }}>{artigos.length} artigos</div>
        </div>
        <div style={{ flex: 1 }} />
        <button style={{
          height: '32px', padding: '0 0.875rem', borderRadius: '8px',
          border: '0.5px solid rgba(196,169,106,0.4)',
          background: 'rgba(196,169,106,0.12)',
          fontSize: '12px', color: '#C4A96A', cursor: 'pointer',
        }}>
          + Artigo
        </button>
      </div>

      {/* Pesquisa */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: '8px', padding: '0 0.75rem', height: '34px',
        marginBottom: '1rem',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}>🔍</span>
        <input
          value={pesquisa}
          onChange={e => setPesquisa(e.target.value)}
          placeholder={`Pesquisar em ${nomeDecoded}...`}
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            fontSize: '12px', color: 'rgba(255,255,255,0.7)', width: '100%',
          }}
        />
        {pesquisa && (
          <span onClick={() => setPesquisa('')} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>✕</span>
        )}
      </div>

      {/* Subcategorias */}
      {subs.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {subs.map(sub => (
            <button
              key={sub}
              onClick={() => setSubAtiva(sub)}
              style={{
                height: '28px', padding: '0 0.75rem', borderRadius: '20px',
                border: subAtiva === sub ? '0.5px solid rgba(196,169,106,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
                background: subAtiva === sub ? 'rgba(196,169,106,0.12)' : 'rgba(255,255,255,0.03)',
                fontSize: '11.5px',
                color: subAtiva === sub ? '#C4A96A' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
              }}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Lista de artigos */}
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', padding: '2rem 0' }}>A carregar...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', padding: '2rem 0' }}>Nenhum artigo encontrado.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtrados.map(artigo => (
            <CardArtigo key={artigo.id} artigo={artigo} />
          ))}
        </div>
      )}
    </div>
  )
}

function CardArtigo({ artigo }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(8px)',
        border: hovered ? '0.5px solid rgba(196,169,106,0.2)' : '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        alignItems: 'center',
        gap: '1rem',
        transition: 'all 0.15s',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />

      <div>
        <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.78)', marginBottom: '3px', lineHeight: 1.4 }}>
          {artigo.desc}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {artigo.ref && (
            <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.28)' }}>ref: {artigo.ref}</span>
          )}
          {artigo.supplier && (
            <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.28)' }}>{artigo.supplier}</span>
          )}
          {artigo.sub && (
            <span style={{
              fontSize: '10px', padding: '1px 7px', borderRadius: '20px',
              background: 'rgba(196,169,106,0.08)', color: 'rgba(196,169,106,0.7)',
            }}>
              {artigo.sub}
            </span>
          )}
        </div>
      </div>

      <div style={{ fontSize: '13px', fontWeight: 500, color: '#C4A96A', whiteSpace: 'nowrap' }}>
        {artigo.price ? `${artigo.price} €` : '—'}
      </div>

      {artigo.link && (
        <a
          href={artigo.link}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.3)',
            textDecoration: 'none', padding: '4px 8px',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
          }}
        >
          ↗
        </a>
      )}

      <button style={{
        height: '28px', padding: '0 0.75rem', borderRadius: '6px',
        border: '0.5px solid rgba(196,169,106,0.3)',
        background: 'rgba(196,169,106,0.08)',
        fontSize: '11px', color: '#C4A96A', cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}>
        + Orçamento
      </button>
    </div>
  )
}
