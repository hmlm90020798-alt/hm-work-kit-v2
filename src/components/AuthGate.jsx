import { useState, useEffect } from 'react'
import { auth, googleProvider } from '../firebase/config'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'

export default function AuthGate({ children }) {
  const [user, setUser] = useState(undefined) // undefined = a verificar, null = sem sessão

  useEffect(() => onAuthStateChanged(auth, u => setUser(u)), [])

  if (user === undefined) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0d0d0f',color:'rgba(255,255,255,0.3)',fontSize:'13px'}}>
        A verificar sessão...
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0d0d0f',gap:'1.5rem'}}>
        <div style={{fontSize:'15px',fontWeight:600,color:'#C4A96A',letterSpacing:'0.05em'}}>work kit</div>
        <button
          onClick={()=>signInWithPopup(auth, googleProvider).catch(e=>console.error(e))}
          style={{
            height:'42px', padding:'0 1.5rem', borderRadius:'10px',
            border:'0.5px solid rgba(196,169,106,0.35)',
            background:'rgba(196,169,106,0.1)',
            color:'#C4A96A', fontSize:'13px', fontWeight:500,
            cursor:'pointer', display:'flex', alignItems:'center', gap:'8px',
          }}
        >
          Entrar com Google
        </button>
      </div>
    )
  }

  return children(user)
}

export function LogoutButton() {
  return (
    <button
      onClick={()=>signOut(auth)}
      title="Terminar sessão"
      style={{
        background:'transparent', border:'none', cursor:'pointer',
        color:'rgba(255,255,255,0.25)', fontSize:'11px', padding:'4px',
      }}
    >
      Sair
    </button>
  )
}
