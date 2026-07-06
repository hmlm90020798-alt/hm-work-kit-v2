// Gera uma cor consistente a partir de uma string (nome de secção, kit, etc.)
// Mesma string = mesma cor sempre, sem precisar de escolha manual.

const PALETA = [
  { bg:'rgba(196,169,106,0.12)', color:'#C4A96A', glow:'rgba(196,169,106,0.3)' },
  { bg:'rgba(80,140,230,0.12)',  color:'#7aaff0', glow:'rgba(80,140,230,0.25)' },
  { bg:'rgba(40,190,140,0.1)',   color:'#4dcfaa', glow:'rgba(40,190,140,0.2)' },
  { bg:'rgba(220,90,60,0.1)',    color:'#e8806a', glow:'rgba(220,90,60,0.2)' },
  { bg:'rgba(150,100,230,0.12)', color:'#b090e8', glow:'rgba(150,100,230,0.25)' },
  { bg:'rgba(80,190,80,0.1)',    color:'#78d878', glow:'rgba(80,190,80,0.2)' },
  { bg:'rgba(220,80,140,0.1)',   color:'#e080b8', glow:'rgba(220,80,140,0.2)' },
  { bg:'rgba(230,180,60,0.1)',   color:'#e6b43c', glow:'rgba(230,180,60,0.2)' },
]

export function corPorNome(nome) {
  if (!nome) return PALETA[0]
  let hash = 0
  for (let i = 0; i < nome.length; i++) {
    hash = (hash * 31 + nome.charCodeAt(i)) & 0x7fffffff
  }
  return PALETA[hash % PALETA.length]
}
