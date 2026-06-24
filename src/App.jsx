import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import './index.css'
import Biblioteca from './pages/Biblioteca'
import Categoria from './pages/Categoria'

const navSections = [
  {
    label: 'Enciclopédia',
    items: [
      { to: '/biblioteca', label: 'Biblioteca' },
      { to: '/tampos', label: 'Tampos' },
      { to: '/mao-de-obra', label: 'Mão de obra' },
      { to: '/bundles', label: 'Bundles' },
      { to: '/kits', label: 'Kits' },
    ]
  },
  {
    label: 'Trabalho',
    items: [
      { to: '/projectos', label: 'Projectos' },
      { to: '/orcamento', label: 'Orçamento' },
      { to: '/proposta', label: 'Proposta' },
    ]
  },
  {
    label: 'Ferramentas',
    items: [
      { to: '/kc', label: 'KC' },
    ]
  }
]

function Sidebar() {
  return (
    <aside style={{
      width: '200px',
      flexShrink: 0,
      padding: '1.25rem 0.75rem',
      borderRight: '0.5px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      minHeight: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#C4A96A',
        padding: '0 0.5rem 1rem',
        letterSpacing: '0.05em'
      }}>
        work kit
      </div>
      {navSections.map(section => (
        <div key={section.label}>
          <div style={{
            fontSize: '9px',
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.25)',
            padding: '0.75rem 0.5rem 0.3rem',
            textTransform: 'uppercase'
          }}>
            {section.label}
          </div>
          {section.items.map(item => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              fontSize: '12.5px',
              color: isActive ? '#C4A96A' : 'rgba(255,255,255,0.45)',
              background: isActive ? 'rgba(196,169,106,0.1)' : 'transparent',
              border: isActive ? '0.5px solid rgba(196,169,106,0.2)' : '0.5px solid transparent',
              textDecoration: 'none',
              marginBottom: '2px',
            })}>
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </aside>
  )
}

function Placeholder({ label }) {
  return (
    <div style={{ padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
      {label} — em construção
    </div>
  )
}

function App() {
  return (
    <BrowserRouter basename="/hm-work-kit-v2">
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Placeholder label="Início" />} />
            <Route path="/biblioteca" element={<Biblioteca key="biblioteca" />} />
            <Route path="/biblioteca/:nome" element={<Categoria />} />
            <Route path="/tampos" element={<Placeholder label="Tampos" />} />
            <Route path="/mao-de-obra" element={<Placeholder label="Mão de obra" />} />
            <Route path="/bundles" element={<Placeholder label="Bundles" />} />
            <Route path="/kits" element={<Placeholder label="Kits" />} />
            <Route path="/projectos" element={<Placeholder label="Projectos" />} />
            <Route path="/orcamento" element={<Placeholder label="Orçamento" />} />
            <Route path="/proposta" element={<Placeholder label="Proposta" />} />
            <Route path="/kc" element={<Placeholder label="KC" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
