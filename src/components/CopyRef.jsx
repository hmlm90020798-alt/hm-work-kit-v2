import { useState } from 'react'

export default function CopyRef({ refCode, style={} }) {
  const [copied, setCopied] = useState(false)

  if (!refCode) return null

  const copy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(refCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <span
      onClick={copy}
      title="Copiar referência LM"
      style={{
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: 'monospace',
        letterSpacing: '0.05em',
        color: copied ? '#4dcfaa' : '#C4A96A',
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '6px',
        background: copied ? 'rgba(77,207,170,0.1)' : 'rgba(196,169,106,0.06)',
        border: copied ? '0.5px solid rgba(77,207,170,0.3)' : '0.5px solid rgba(196,169,106,0.2)',
        transition: 'all 0.2s',
        userSelect: 'none',
        flexShrink: 0,
        boxShadow: copied ? '0 0 8px rgba(77,207,170,0.2)' : 'none',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {copied ? '✓ copiado' : refCode}
    </span>
  )
}
