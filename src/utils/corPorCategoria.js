// Cor consistente por categoria de artigo (Eletrodomésticos, Sanitários, etc.)
// Mapeado pelo nome (campo `cat` do artigo), com fallback automático por hash.

const COR_MAP = {
  amber:  { bg:'rgba(196,169,106,0.12)', color:'#C4A96A', glow:'rgba(196,169,106,0.3)' },
  blue:   { bg:'rgba(80,140,230,0.12)',  color:'#7aaff0', glow:'rgba(80,140,230,0.25)' },
  gray:   { bg:'rgba(140,140,150,0.1)',  color:'rgba(255,255,255,0.45)', glow:'rgba(140,140,150,0.15)' },
  coral:  { bg:'rgba(220,90,60,0.1)',    color:'#e8806a', glow:'rgba(220,90,60,0.2)' },
  teal:   { bg:'rgba(40,190,140,0.1)',   color:'#4dcfaa', glow:'rgba(40,190,140,0.2)' },
  green:  { bg:'rgba(80,190,80,0.1)',    color:'#78d878', glow:'rgba(80,190,80,0.2)' },
  purple: { bg:'rgba(150,100,230,0.12)', color:'#b090e8', glow:'rgba(150,100,230,0.25)' },
  pink:   { bg:'rgba(220,80,140,0.1)',   color:'#e080b8', glow:'rgba(220,80,140,0.2)' },
}

const POR_NOME = {
  'Acessórios': 'blue',
  'Aquecimento e Conforto': 'pink',
  'Caixilharia': 'gray',
  'Colas · Tintas · Vernizes': 'coral',
  'Decoração': 'purple',
  'Eletrodomésticos': 'amber',
  'Ferragens': 'gray',
  'Iluminação': 'amber',
  'Limpeza': 'teal',
  'Material Pro': 'teal',
  'Pavimento e revestimento': 'green',
  'Sanitários': 'blue',
  'Tampos': 'teal',
}

export function corPorCategoria(nomeCategoria) {
  if (!nomeCategoria) return COR_MAP.gray
  const chave = POR_NOME[nomeCategoria]
  if (chave) return COR_MAP[chave]
  // fallback: hash simples para categorias não mapeadas
  let hash = 0
  for (let i=0;i<nomeCategoria.length;i++) hash = (hash*31+nomeCategoria.charCodeAt(i)) & 0x7fffffff
  const chaves = Object.keys(COR_MAP)
  return COR_MAP[chaves[hash % chaves.length]]
}
