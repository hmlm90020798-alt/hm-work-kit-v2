import { useState } from 'react'

// marcado: estado persistente (guardado externamente) — fica ✓ até ser reiniciado
// onCopy: callback chamado quando o utilizador copia (para o pai persistir o estado)
export default function CopyRef({ refCode, style={}, marcado=false, onCopy }) {
  const [flash, setFlash] = useState(false)

  if (!refCode) return null

  const copy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(refCode).then(() => {
      setFlash(true)
      setTimeout(() => setFlash(false), 900)
      onCopy?.()
    })
  }

  const ativo = flash || marcado

  return (
    <span
      onClick={copy}
      title={marcado ? 'Já copiado — clicar para copiar novamente' : 'Copiar referência LM'}
      style={{
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: 'monospace',
        letterSpacing: '0.05em',
        color: ativo ? '#4dcfaa' : '#C4A96A',
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '6px',
        background: ativo ? 'rgba(77,207,170,0.1)' : 'rgba(196,169,106,0.06)',
        border: ativo ? '0.5px solid rgba(77,207,170,0.3)' : '0.5px solid rgba(196,169,106,0.2)',
        transition: 'all 0.2s',
        userSelect: 'none',
        flexShrink: 0,
        boxShadow: ativo ? '0 0 8px rgba(77,207,170,0.2)' : 'none',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        ...style
      }}
    >
      {marcado && !flash && <span style={{fontSize:'10px'}}>✓</span>}
      {flash ? '✓ copiado' : refCode}
    </span>
  )
}
