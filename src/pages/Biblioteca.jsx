import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, getDocs } from 'firebase/firestore'

const CATEGORIAS_DEFAULT = [
  { id: 'eletrodomesticos', nome: 'Eletrodomésticos', cor: 'amber', icone: '⚡' },
  { id: 'acessorios', nome: 'Acessórios', cor: 'blue', icone: '🔩' },
  { id: 'ferragens', nome: 'Ferragens', cor: 'gray', icone: '🔧' },
  { id: 'iluminacao', nome: 'Iluminação', cor: 'amber', icone: '💡' },
  { id: 'colas-tintas', nome: 'Colas · Tintas', cor: 'coral', icone: '🎨' },
  { id: 'tampos', nome: 'Tampos', cor: 'teal', icone: '⬛' },
  { id: 'sanitarios', nome: 'Sanitários', cor: 'blue', icone: '🚿' },
  { id: 'pavimento', nome: 'Pavimento', cor: 'green', icone: '🟫' },
  { id: 'decoracao', nome: 'Decoração', cor: 'purple', icone: '🪴' },
  { id: 'aquecimento', nome: 'Aquecimento', cor: 'pink', icone: '🔥' },
  { id: 'caixilharia', nome: 'Caixilharia', cor: 'gray', icone: '🪟' },
  { id: 'material-pro', nome: 'Material Pro', cor: 'teal', icone: '📦' },
]

const KITS_DEFAULT = [
  { id: 'cozinha-base', nome: 'Cozinha base', desc: 'Torneira · sifão · acessórios essenciais', cor: 'amber', icone: '👨‍🍳' },
  { id: 'casa-banho', nome: 'Casa de banho completa', desc: 'Lavatório · sanita · duche · acessórios', cor: 'teal', icone: '🚿' },
  { id: 'eletro-encastrar', nome: 'Eletrodomésticos encastrar', desc: 'Forno · placa · exaustor · lava-loiças', cor: 'purple', icone: '🔌' },
]

const COR_MAP = {
  amber:  { bg: 'rgba(196,169,106,0.12)', color: '#C4A96A', glow: 'rgba(196,169,106,0.25)' },
  blue:   { bg: 'rgba(80,140,230,0.12)',  color: '#7aaff0', glow: 'rgba(80,140,230,0.22)' },
  gray:   { bg: 'rgba(140,140,150,0.1)',  color: 'rgba(255,255,255,0.45)', glow: 'rgba(140,140,150,0.15)' },
  coral:  { bg: 'rgba(220,90,60,0.1)',    color: '#e8806a', glow: 'rgba(220,90,60,0.2)' },
  teal:   { bg: 'rgba(40,190,140,0.1)',   color: '#4dcfaa', glow: 'rgba(40,190,140,0.2)' },
  green:  { bg: 'rgba(80,190,80,0.1)',    color: '#78d878', glow: 'rgba(80,190,80,0.2)' },
  purple: { bg: 'rgba(150,100,230,0.12)', color: '#b090e8', glow: 'rgba(150,100,230,0.22)' },
  pink:   { bg: 'rgba(220,80,140,0.1)',   color: '#e080b8', glow: 'rgba(220,80,140,0.2)' },
}

function CardCategoria({ cat, count, onClick }) {
  const [hovered, setHovered] = useState(false)
  const c = COR_MAP[cat.cor] || COR_MAP.gray

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: hovered ? '0.5px solid rgba(196,169,106,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '1rem 0.875rem 0.875rem',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)'
      }} />
      {hovered && (
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px',
          width: '80px', height: '80px', borderRadius: '50%',
          background: `radial-gradient(circle, ${c.glow}, transparent)`,
          pointerEvents: 'none',
        }} />
      )}
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px',
        background: c.bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', marginBottom: '0.75rem',
        fontSize: '18px', position: 'relative', zIndex: 1,
        boxShadow: `0 0 14px ${c.glow}`,
      }}>
        {cat.icone}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: '3px', position: 'relative', zIndex: 1 }}>
        {cat.nome}
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', position: 'relative', zIndex: 1 }}>
        {count} artigos
      </div>
    </div>
  )
}

function CardKit({ kit, onClick }) {
  const [hovered, setHovered] = useState(false)
  const c = COR_MAP[kit.cor] || COR_MAP.amber

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: hovered ? '0.5px solid rgba(196,169,106,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
      <div style={{
        width: '40px', height: '40px', borderRadius: '8px',
        background: c.bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '20px', flexShrink: 0,
        boxShadow: `0 0 14px ${c.glow}`,
      }}>
        {kit.icone}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: '2px' }}>
          {kit.nome}
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', lineHeight: 1.4 }}>
          {kit.desc}
        </div>
      </div>
      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '16px' }}>›</span>
    </div>
  )
}

export default function Biblioteca() {
  const [artigos, setArtigos] = useState([])
  const [pesquisa, setPesquisa] = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, 'artigos'))
        setArtigos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.log('Sem artigos no Firestore ainda')
      }
    }
    fetch()
  }, [])

  const contarPorCategoria = (id) =>
    artigos.filter(a => a.categoria === id).length || Math.floor(Math.random() * 30 + 1)

  const categoriasFiltradas = CATEGORIAS_DEFAULT.filter(c =>
    c.nome.toLowerCase().includes(pesquisa.toLowerCase())
  )

  return (
    <div style={{ padding: '1.5rem 1.25rem', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: '-100px', right: '100px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(196,169,106,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '8px', padding: '0 0.75rem', height: '34px',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}>🔍</span>
          <input
            value={pesquisa}
            onChange={e => setPesquisa(e.target.value)}
            placeholder="Pesquisar em toda a biblioteca..."
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: '12px', color: 'rgba(255,255,255,0.7)', width: '100%',
            }}
          />
        </div>
        <button style={{
          height: '34px', padding: '0 0.875rem', borderRadius: '8px',
          border: '0.5px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)',
          fontSize: '12px', color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          ↑ Importar
        </button>
        <button style={{
          height: '34px', padding: '0 0.875rem', borderRadius: '8px',
          border: '0.5px solid rgba(196,169,106,0.4)',
          background: 'rgba(196,169,106,0.12)',
          fontSize: '12px', color: '#C4A96A', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          + Artigo
        </button>
      </div>

      {/* Categorias */}
      <div style={{ fontSize: '10px', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '0.875rem' }}>
        Categorias · {CATEGORIAS_DEFAULT.length} categorias
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: '10px',
        marginBottom: '1.75rem',
      }}>
        {categoriasFiltradas.map(cat => (
          <CardCategoria key={cat.id} cat={cat} count={contarPorCategoria(cat.id)} onClick={() => {}} />
        ))}
        <div style={{
          background: 'transparent',
          border: '0.5px dashed rgba(255,255,255,0.1)',
          borderRadius: '12px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '5px', minHeight: '96px', cursor: 'pointer',
        }}>
          <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.18)' }}>+</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Nova categoria</span>
        </div>
      </div>

      {/* Kits */}
      <div style={{ fontSize: '10px', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '0.875rem' }}>
        Kits · {KITS_DEFAULT.length} kits
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {KITS_DEFAULT.map(kit => (
          <CardKit key={kit.id} kit={kit} onClick={() => {}} />
        ))}
        <div style={{
          background: 'transparent',
          border: '0.5px dashed rgba(255,255,255,0.1)',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '8px',
          minHeight: '68px', cursor: 'pointer',
        }}>
          <span style={{ fontSize: '17px', color: 'rgba(255,255,255,0.18)' }}>+</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Novo kit</span>
        </div>
      </div>
    </div>
  )
}
