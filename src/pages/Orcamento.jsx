import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase/config'
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import CopyRef from '../components/CopyRef'
import { corPorNome } from '../utils/corPorNome'
import { corPorCategoria } from '../utils/corPorCategoria'

const ESTADOS = {
  curso:    { label: 'Em curso',  cor: 'rgba(196,169,106,0.8)' },
  enviado:  { label: 'Enviado',   cor: 'rgba(80,140,230,0.8)' },
  aprovado: { label: 'Aprovado',  cor: 'rgba(40,190,140,0.8)' },
  perdido:  { label: 'Perdido',   cor: 'rgba(220,80,80,0.6)' },
}

const BTN = (extra={}) => ({
  height:'34px', padding:'0 1rem', borderRadius:'8px',
  border:'0.5px solid rgba(255,255,255,0.1)',
  background:'rgba(255,255,255,0.04)',
  fontSize:'12px', color:'rgba(255,255,255,0.55)',
  cursor:'pointer', display:'flex', alignItems:'center', gap:'6px',
  whiteSpace:'nowrap', ...extra
})
const BTN_GOLD = (extra={}) => BTN({
  background:'rgba(196,169,106,0.12)',
  border:'0.5px solid rgba(196,169,106,0.35)',
  color:'#C4A96A', ...extra
})
const INPUT = {
  background:'rgba(255,255,255,0.04)',
  border:'0.5px solid rgba(255,255,255,0.08)',
  borderRadius:'8px', padding:'0 0.75rem', height:'36px',
  fontSize:'13px', color:'rgba(255,255,255,0.8)', outline:'none', width:'100%'
}

function formatData(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('pt-PT', { day:'2-digit', month:'short', year:'numeric' })
}

function calcTotal(secoes) {
  if (!secoes) return 0
  return secoes.reduce((t, s) =>
    t + (s.itens||[]).reduce((st, i) => {
      if (i.variantes) {
        const ativa = i.variantes.find(v=>v.ativa) || i.variantes[0]
        return st + ((ativa?.preco||0) * (i.qty||1))
      }
      return st + ((i.preco||0) * (i.qty||1))
    }, 0), 0)
}

export default function Orcamento() {
  const [orcamentos, setOrcamentos] = useState([])
  const [orcAtivoId, setOrcAtivoId] = useState(() => localStorage.getItem('orc_ativo_id') || null)
  const [novoModal, setNovoModal]   = useState(false)
  const [form, setForm] = useState({ nome:'', contacto:'', pc:'' })

  useEffect(() => {
    const u = onSnapshot(collection(db,'orcamentos'), snap => {
      const docs = snap.docs.map(d=>({id:d.id,...d.data()}))
      docs.sort((a,b)=>(b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0))
      setOrcamentos(docs)
    })
    return u
  }, [])

  const setOrcAtivo = (id) => { setOrcAtivoId(id); if (id) localStorage.setItem('orc_ativo_id', id); else localStorage.removeItem('orc_ativo_id') }

  const criarOrcamento = async () => {
    const ref = await addDoc(collection(db,'orcamentos'), {
      ...form, secoes:[], estado:'curso',
      createdAt:serverTimestamp(), updatedAt:serverTimestamp(),
    })
    setNovoModal(false)
    setForm({ nome:'', contacto:'', pc:'' })
    setOrcAtivo(ref.id)
  }

  const delOrcamento = async (id, nome) => {
    if (!confirm(`Eliminar "${nome||'sem nome'}"?`)) return
    await deleteDoc(doc(db,'orcamentos',id))
    if (orcAtivoId===id) setOrcAtivo(null)
  }

  const orcAtivo = orcamentos.find(o=>o.id===orcAtivoId)

  if (orcAtivo) return (
    <OrcamentoDetalhe
      orc={orcAtivo}
      onVoltar={()=>setOrcAtivo(null)}
    />
  )

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)'}}>
        <div style={{flex:1,fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.7)'}}>Orçamentos</div>
        <button onClick={()=>setNovoModal(true)} style={BTN_GOLD()}>+ Novo orçamento</button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>
        {orcamentos.length===0 ? (
          <div style={{textAlign:'center',padding:'4rem 0',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>
            <div style={{fontSize:'32px',marginBottom:'1rem'}}>🧾</div>
            Nenhum orçamento ainda. Cria o primeiro.
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {orcamentos.map(orc => {
              const total = calcTotal(orc.secoes)
              const estado = ESTADOS[orc.estado] || ESTADOS.curso
              return (
                <div key={orc.id} onClick={()=>setOrcAtivo(orc.id)}
                  style={{background:'rgba(255,255,255,0.03)',backdropFilter:'blur(12px)',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem 1.25rem',cursor:'pointer',display:'grid',gridTemplateColumns:'1fr auto',gap:'1rem',alignItems:'center',transition:'all 0.15s',position:'relative',overflow:'hidden'}}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.borderColor='rgba(196,169,106,0.2)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.03)';e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}}
                >
                  <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)'}}/>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                      <span style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>{orc.nome||<span style={{color:'rgba(255,255,255,0.3)',fontStyle:'italic'}}>Sem nome</span>}</span>
                      {orc.pc&&<span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'20px',background:'rgba(196,169,106,0.08)',border:'0.5px solid rgba(196,169,106,0.2)',color:'rgba(196,169,106,0.7)',fontFamily:'monospace'}}>PC {orc.pc}</span>}
                      <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'20px',background:'rgba(255,255,255,0.04)',color:estado.cor}}>{estado.label}</span>
                    </div>
                    <div style={{display:'flex',gap:'16px'}}>
                      {orc.contacto&&<span style={{fontSize:'11.5px',color:'rgba(255,255,255,0.35)'}}>📞 {orc.contacto}</span>}
                      <span style={{fontSize:'11.5px',color:'rgba(255,255,255,0.25)'}}>{formatData(orc.updatedAt)}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    {total>0&&<span style={{fontSize:'15px',fontWeight:500,color:'#C4A96A'}}>{total.toFixed(2)} €</span>}
                    <button onClick={e=>{e.stopPropagation();delOrcamento(orc.id,orc.nome)}} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.35)',fontSize:'14px',padding:'4px'}}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {novoModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
          <div style={{background:'#161618',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'16px',padding:'1.5rem',width:'420px',maxWidth:'90vw'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
              <span style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>Novo orçamento</span>
              <button onClick={()=>setNovoModal(false)} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'18px',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{display:'grid',gap:'10px'}}>
              {[['nome','Nome do cliente'],['contacto','Contacto'],['pc','Nº PC']].map(([k,l])=>(
                <div key={k}>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>{l}</div>
                  <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&criarOrcamento()} placeholder={l} style={INPUT}/>
                </div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'8px',marginTop:'1.25rem'}}>
              <button onClick={()=>setNovoModal(false)} style={BTN()}>Cancelar</button>
              <button onClick={criarOrcamento} style={BTN_GOLD()}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrcamentoDetalhe({ orc, onVoltar }) {
  const navigate = useNavigate()
  const [novaSecao, setNovaSecao] = useState('')
  const [catCollapsed, setCatCollapsed] = useState({})
  const [dragItem, setDragItem] = useState(null)   // { secaoId, idx }
  const [dragSecao, setDragSecao] = useState(null)  // idx da secção
  const [kitsModal, setKitsModal] = useState(null) // secao alvo

  const secoes = orc.secoes || []
  const total = calcTotal(secoes)

  const saveSecoes = async (novas) => {
    await updateDoc(doc(db,'orcamentos',orc.id), { secoes: novas, updatedAt: serverTimestamp() })
  }

  const addSecao = async () => {
    if (!novaSecao.trim()) return
    const nova = { id: Date.now().toString(), nome: novaSecao.trim(), itens:[] }
    await saveSecoes([...secoes, nova])
    setNovaSecao('')
  }

  const delSecao = async (id) => {
    await saveSecoes(secoes.filter(s=>s.id!==id))
  }

  const delItem = async (secaoId, idx) => {
    const novas = secoes.map(s => {
      if (s.id!==secaoId) return s
      return { ...s, itens: s.itens.filter((_,i)=>i!==idx) }
    })
    await saveSecoes(novas)
  }

  const marcarCopiado = async (secaoId, idx) => {
    const novas = secoes.map(s => {
      if (s.id !== secaoId) return s
      const itens = [...s.itens]
      itens[idx] = { ...itens[idx], copiado: true }
      return { ...s, itens }
    })
    await saveSecoes(novas)
  }

  const resetCopiados = async (secaoId) => {
    const novas = secoes.map(s => {
      if (s.id !== secaoId) return s
      return { ...s, itens: s.itens.map(i => ({ ...i, copiado: false })) }
    })
    await saveSecoes(novas)
  }

  const updateQty = async (secaoId, idx, qty) => {
    if (qty<1) return
    const novas = secoes.map(s => {
      if (s.id!==secaoId) return s
      const itens = [...s.itens]
      itens[idx] = { ...itens[idx], qty }
      return { ...s, itens }
    })
    await saveSecoes(novas)
  }

  const aplicarKit = async (secao, kit) => {
    const itensKit = (kit.itens||[]).map(i=>({ ref:i.ref||'', desc:i.desc, preco:i.preco||0, link:i.link||'', qty:1, origemKit:kit.nome }))
    const novas = secoes.map(s => s.id===secao.id ? {...s, itens:[...(s.itens||[]), ...itensKit]} : s)
    await saveSecoes(novas)
    setKitsModal(null)
  }

  const reorderItem = async (secaoId, fromIdx, toIdx) => {
    if (fromIdx === toIdx) return
    const novas = secoes.map(s => {
      if (s.id !== secaoId) return s
      const itens = [...s.itens]
      const [moved] = itens.splice(fromIdx, 1)
      itens.splice(toIdx, 0, moved)
      return { ...s, itens }
    })
    await saveSecoes(novas)
  }

  const reorderSecao = async (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return
    const novas = [...secoes]
    const [moved] = novas.splice(fromIdx, 1)
    novas.splice(toIdx, 0, moved)
    await saveSecoes(novas)
  }

  const irTampos = (secao) => {
    localStorage.setItem('orc_contexto', JSON.stringify({ orcId: orc.id, secaoId: secao.id, secaoNome: secao.nome }))
    navigate('/tampos')
  }

  const irMaoDeObra = (secao) => {
    localStorage.setItem('orc_contexto', JSON.stringify({ orcId: orc.id, secaoId: secao.id, secaoNome: secao.nome }))
    navigate('/mao-de-obra')
  }

  const irBiblioteca = (secao) => {
    localStorage.setItem('orc_contexto', JSON.stringify({
      orcId: orc.id, secaoId: secao.id, secaoNome: secao.nome
    }))
    navigate('/biblioteca')
  }

  const irBibliotecaVariante = (secao, itemIdx) => {
    localStorage.setItem('orc_contexto', JSON.stringify({
      orcId: orc.id, secaoId: secao.id, secaoNome: secao.nome,
      varianteDeIdx: itemIdx
    }))
    navigate('/biblioteca')
  }

  const toggleVariante = async (secaoId, itemIdx, varIdx) => {
    const novas = secoes.map(s => {
      if (s.id !== secaoId) return s
      const itens = [...s.itens]
      const item = {...itens[itemIdx]}
      if (item.variantes) {
        item.variantes = item.variantes.map((v,i) => ({...v, ativa: i===varIdx}))
      }
      itens[itemIdx] = item
      return {...s, itens}
    })
    await saveSecoes(novas)
  }

  const delVariante = async (secaoId, itemIdx, varIdx) => {
    const novas = secoes.map(s => {
      if (s.id !== secaoId) return s
      const itens = [...s.itens]
      const item = {...itens[itemIdx]}
      if (item.variantes && item.variantes.length > 1) {
        item.variantes = item.variantes.filter((_,i) => i!==varIdx)
        // garantir que há sempre uma ativa
        if (!item.variantes.some(v=>v.ativa)) item.variantes[0].ativa = true
      }
      itens[itemIdx] = item
      return {...s, itens}
    })
    await saveSecoes(novas)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)'}}>
        <button onClick={onVoltar} style={BTN()}>← Orçamentos</button>
        <div style={{flex:1}}>
          <span style={{fontSize:'13px',fontWeight:500,color:'rgba(255,255,255,0.8)'}}>{orc.nome||'Sem nome'}</span>
          {orc.pc&&<span style={{marginLeft:'8px',fontSize:'11px',color:'rgba(196,169,106,0.7)',fontFamily:'monospace'}}>PC {orc.pc}</span>}
        </div>
        <span style={{fontSize:'15px',fontWeight:500,color:'#C4A96A'}}>{total.toFixed(2)} €</span>
        <button onClick={()=>{localStorage.setItem('proposta_orc_id',orc.id);navigate('/proposta')}} style={BTN_GOLD()}>↗ Proposta</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',padding:'1rem 1.25rem',borderBottom:'0.5px solid rgba(255,255,255,0.05)',flexShrink:0}}>
        {[['Secções',secoes.length],['Artigos',secoes.reduce((t,s)=>t+(s.itens||[]).length,0)],['Total',total.toFixed(2)+' €']].map(([l,v])=>(
          <div key={l} style={{background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'0.75rem 1rem'}}>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.28)',marginBottom:'4px',letterSpacing:'0.05em',textTransform:'uppercase'}}>{l}</div>
            <div style={{fontSize:'16px',fontWeight:500,color:l==='Total'?'#C4A96A':'rgba(255,255,255,0.8)'}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>
        {secoes.length===0 ? (
          <div style={{textAlign:'center',padding:'3rem 0',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>
            Adiciona a primeira secção — ex: Cozinha, Casa de banho...
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'1rem'}}>
            {secoes.map((secao,secaoIdx) => (
              <div key={secao.id}
                draggable
                onDragStart={()=>setDragSecao(secaoIdx)}
                onDragOver={e=>e.preventDefault()}
                onDrop={()=>{if(dragSecao!==null){reorderSecao(dragSecao,secaoIdx);setDragSecao(null)}}}
                onDragEnd={()=>setDragSecao(null)}
                style={{background:'rgba(255,255,255,0.025)',border:'0.5px solid rgba(255,255,255,0.07)',borderLeft:`2px solid ${corPorNome(secao.nome).color}`,borderRadius:'10px',overflow:'hidden',opacity:dragSecao===secaoIdx?0.4:1,transition:'opacity 0.15s'}}
              >
                <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0.6rem 1rem',borderBottom:'0.5px solid rgba(255,255,255,0.05)',cursor:'grab'}}>
                  <span style={{color:'rgba(255,255,255,0.15)',fontSize:'12px',cursor:'grab'}}>⠿</span>
                  <span style={{width:'8px',height:'8px',borderRadius:'50%',background:corPorNome(secao.nome).color,boxShadow:`0 0 6px ${corPorNome(secao.nome).glow}`,flexShrink:0}}/>
                  <span style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.6)',flex:1}}>{secao.nome}</span>
                  {(()=>{const total=(secao.itens||[]).length,cop=(secao.itens||[]).filter(i=>i.copiado).length
                    return total>0 && <span style={{fontSize:'10px',color:cop===total?'#4dcfaa':'rgba(255,255,255,0.3)',background:cop===total?'rgba(77,207,170,0.1)':'rgba(255,255,255,0.04)',padding:'2px 8px',borderRadius:'20px'}}>{cop}/{total} copiados</span>})()}
                  {(secao.itens||[]).some(i=>i.copiado) && (
                    <button tabIndex={-1} onClick={()=>resetCopiados(secao.id)} title="Reiniciar marcações de cópia" style={{background:'transparent',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'6px',color:'rgba(255,255,255,0.35)',fontSize:'10px',padding:'3px 8px',cursor:'pointer'}}>↺ reset</button>
                  )}
                  <span style={{fontSize:'11px',color:'rgba(255,255,255,0.25)'}}>{(secao.itens||[]).length} itens</span>
                  <span style={{fontSize:'12px',fontWeight:500,color:'#C4A96A',marginLeft:'8px'}}>
                    {(secao.itens||[]).reduce((t,i)=>t+(i.preco||0)*(i.qty||1),0).toFixed(2)} €
                  </span>
                  <button tabIndex={-1} onClick={()=>delSecao(secao.id)} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.3)',fontSize:'13px',padding:'2px 6px'}}>✕</button>
                </div>

                <div style={{padding:'8px 1rem',borderBottom:'0.5px solid rgba(255,255,255,0.04)',display:'flex',gap:'8px'}}>
                  <button onClick={()=>irBiblioteca(secao)} style={{height:'28px',padding:'0 0.875rem',borderRadius:'6px',border:'0.5px solid rgba(196,169,106,0.3)',background:'rgba(196,169,106,0.06)',fontSize:'11.5px',color:'rgba(196,169,106,0.8)',cursor:'pointer'}}>
                    + Artigo da Biblioteca
                  </button>
                  <button onClick={()=>setKitsModal(secao)} style={{height:'28px',padding:'0 0.875rem',borderRadius:'6px',border:'0.5px solid rgba(80,140,230,0.3)',background:'rgba(80,140,230,0.06)',fontSize:'11.5px',color:'rgba(80,140,230,0.8)',cursor:'pointer'}}>
                    + Kit
                  </button>
                  <button onClick={()=>irMaoDeObra(secao)} style={{height:'28px',padding:'0 0.875rem',borderRadius:'6px',border:'0.5px solid rgba(150,100,230,0.3)',background:'rgba(150,100,230,0.06)',fontSize:'11.5px',color:'rgba(150,100,230,0.8)',cursor:'pointer'}}>
                    + Mão de obra
                  </button>
                  <button onClick={()=>irTampos(secao)} style={{height:'28px',padding:'0 0.875rem',borderRadius:'6px',border:'0.5px solid rgba(40,190,140,0.3)',background:'rgba(40,190,140,0.06)',fontSize:'11.5px',color:'rgba(40,190,140,0.8)',cursor:'pointer'}}>
                    + Tampo
                  </button>
                </div>

                {(secao.itens||[]).length===0 ? (
                  <div style={{padding:'0.75rem 1rem',fontSize:'12px',color:'rgba(255,255,255,0.2)'}}>
                    Nenhum artigo ainda.
                  </div>
                ) : (() => {
                  // Agrupar itens por categoria mantendo o índice original (necessário para as ações)
                  const comIdx = (secao.itens||[]).map((item,idx)=>({item,idx}))
                  const grupos = {}
                  comIdx.forEach(({item,idx}) => {
                    const groupKey = item.origemKit ? ('kit:'+item.origemKit) : (item.cat || (item.variantes?.[0]?.cat) || 'Outros')
                    if (!grupos[groupKey]) grupos[groupKey] = []
                    grupos[groupKey].push({item,idx})
                  })
                  const nomesCats = Object.keys(grupos).sort((a,b)=>{
                    const aKit=a.startsWith('kit:'), bKit=b.startsWith('kit:')
                    if (aKit && !bKit) return -1
                    if (!aKit && bKit) return 1
                    if (a==='Mão de Obra') return 1
                    if (b==='Mão de Obra') return -1
                    return a.localeCompare(b)
                  })

                  return nomesCats.map(catNome => {
                    const grupo = grupos[catNome]
                    const isKitGroup = catNome.startsWith('kit:')
                    const nomeExibido = isKitGroup ? catNome.slice(4) : catNome
                    const corCat = isKitGroup ? corPorNome(nomeExibido) : corPorCategoria(catNome)
                    const key = secao.id+':'+catNome
                    const isOpen = !catCollapsed[key]
                    const subtotal = grupo.reduce((t,{item})=>{
                      const ativa = item.variantes ? (item.variantes.find(v=>v.ativa)||item.variantes[0]) : item
                      return t + (ativa.preco||item.preco||0)*(item.qty||1)
                    },0)
                    return (
                      <div key={catNome}>
                        <button
                          onClick={()=>setCatCollapsed(c=>({...c,[key]:!c[key]}))}
                          style={{width:'100%',display:'flex',alignItems:'center',gap:'8px',padding:'0.45rem 1rem',background:corCat.bg,border:'none',borderBottom:'0.5px solid rgba(255,255,255,0.04)',cursor:'pointer',textAlign:'left'}}
                        >
                          <span style={{width:'6px',height:'6px',borderRadius:'50%',background:corCat.color,flexShrink:0}}/>
                          <span style={{fontSize:'11px',fontWeight:600,color:corCat.color,letterSpacing:'0.04em'}}>{isKitGroup ? `Kit: ${nomeExibido}` : catNome}</span>
                          <span style={{fontSize:'10px',color:'rgba(255,255,255,0.3)'}}>({grupo.length})</span>
                          <span style={{flex:1}}/>
                          <span style={{fontSize:'12px',fontWeight:500,color:corCat.color}}>{subtotal.toFixed(2)} €</span>
                          <span style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',transform:isOpen?'rotate(0deg)':'rotate(-90deg)',transition:'transform 0.15s',display:'inline-block'}}>▾</span>
                        </button>
                        {isOpen && (
                          <>
                            <div style={{display:'grid',gridTemplateColumns:'16px 1fr 90px 80px 32px',padding:'0.3rem 1rem',borderBottom:'0.5px solid rgba(255,255,255,0.03)'}}>
                              {['','Artigo','Qty','Total',''].map((h,hi)=>(
                                <span key={hi} style={{fontSize:'9px',color:'rgba(255,255,255,0.18)',letterSpacing:'0.06em',textTransform:'uppercase',textAlign:h==='Total'?'right':h===''?'center':'left'}}>{h}</span>
                              ))}
                            </div>
                            {grupo.map(({item,idx})=>{
                              const temVariantes = item.variantes && item.variantes.length > 1
                              const ativa = temVariantes ? (item.variantes.find(v=>v.ativa)||item.variantes[0]) : item
                              return (
                                <div key={idx}
                                  draggable
                                  onDragStart={()=>setDragItem({secaoId:secao.id, idx})}
                                  onDragOver={e=>e.preventDefault()}
                                  onDrop={()=>{if(dragItem&&dragItem.secaoId===secao.id){reorderItem(secao.id,dragItem.idx,idx);setDragItem(null)}}}
                                  onDragEnd={()=>setDragItem(null)}
                                  style={{opacity:dragItem?.secaoId===secao.id&&dragItem.idx===idx?0.35:1,transition:'opacity 0.15s'}}
                                >
                          {/* Linha principal */}
                          <div
                            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.055)'}
                            onMouseLeave={e=>e.currentTarget.style.background=item.copiado ? 'rgba(255,255,255,0.015)' : `linear-gradient(90deg, ${corCat.glow} 0%, transparent 40%)`}
                            style={{
                            display:'grid',gridTemplateColumns:'16px 1fr 90px 80px 100px 32px',alignItems:'center',
                            padding:'0.5rem 1rem',borderBottom:'0.5px solid rgba(255,255,255,0.03)',
                            borderLeft:`2px solid ${corCat.color}`,
                            background: item.copiado ? 'rgba(255,255,255,0.015)' : `linear-gradient(90deg, ${corCat.glow} 0%, transparent 40%)`,
                            opacity: item.copiado ? 0.55 : 1,
                            transition:'background 0.1s, opacity 0.2s',
                            cursor:'grab',
                          }}>
                            <span style={{color:'rgba(255,255,255,0.12)',fontSize:'11px'}}>⠿</span>
                            <div>
                              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.75)',marginBottom:'2px'}}>{ativa.desc||item.desc}</div>
                              <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                                <CopyRef refCode={ativa.ref||item.ref} marcado={item.copiado} onCopy={()=>marcarCopiado(secao.id,idx)} />
                                {(ativa.link||item.link) && (
                                  <a href={ativa.link||item.link} target="_blank" rel="noreferrer" tabIndex={-1} onClick={e=>e.stopPropagation()} style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',textDecoration:'none',padding:'2px 6px',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'5px'}}>↗</a>
                                )}
                                {item.cat && <span style={{fontSize:'9px',padding:'1px 6px',borderRadius:'20px',background:corCat.bg,color:corCat.color}}>{item.cat}</span>}
                                {temVariantes && <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'20px',background:'rgba(196,169,106,0.1)',color:'#C4A96A'}}>A/B</span>}
                              </div>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                              <button tabIndex={-1} onClick={()=>updateQty(secao.id,idx,(item.qty||1)-1)} style={{width:'22px',height:'22px',borderRadius:'4px',border:'0.5px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                              <input
                                type="number"
                                value={item.qty||1}
                                min={1}
                                onClick={e=>e.stopPropagation()}
                                onFocus={e=>e.target.select()}
                                onChange={e=>updateQty(secao.id,idx,parseInt(e.target.value)||1)}
                                style={{width:'34px',height:'22px',background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'4px',color:'rgba(255,255,255,0.75)',fontSize:'12px',textAlign:'center',outline:'none'}}
                              />
                              <button tabIndex={-1} onClick={()=>updateQty(secao.id,idx,(item.qty||1)+1)} style={{width:'22px',height:'22px',borderRadius:'4px',border:'0.5px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                            </div>
                            <span style={{fontSize:'12px',fontWeight:500,color:'#C4A96A',textAlign:'right'}}>{((ativa.preco||item.preco||0)*(item.qty||1)).toFixed(2)} €</span>
                            <button tabIndex={-1} onClick={()=>irBibliotecaVariante(secao,idx)} style={{height:'22px',padding:'0 6px',borderRadius:'4px',border:'0.5px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.03)',fontSize:'10px',color:'rgba(255,255,255,0.35)',cursor:'pointer',whiteSpace:'nowrap'}}>+ Variante</button>
                            <button tabIndex={-1} onClick={()=>delItem(secao.id,idx)} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.35)',fontSize:'13px',textAlign:'center'}}>✕</button>
                          </div>
                          {/* Variantes A/B */}
                          {temVariantes && item.variantes.map((v,vi)=>(
                            <div key={vi} onClick={()=>toggleVariante(secao.id,idx,vi)} style={{display:'grid',gridTemplateColumns:'1fr 80px 32px',alignItems:'center',padding:'0.35rem 1rem 0.35rem 2rem',borderBottom:'0.5px solid rgba(255,255,255,0.02)',cursor:'pointer',background:v.ativa?'rgba(77,207,170,0.04)':'rgba(255,255,255,0.01)',transition:'background 0.15s'}}>
                              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                                <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'4px',background:v.ativa?'rgba(77,207,170,0.15)':'rgba(255,255,255,0.05)',color:v.ativa?'#4dcfaa':'rgba(255,255,255,0.3)',fontWeight:600}}>{vi===0?'A':'B'}</span>
                                <div>
                                  <div style={{fontSize:'11.5px',color:v.ativa?'rgba(255,255,255,0.75)':'rgba(255,255,255,0.35)'}}>{v.desc}</div>
                                  <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                    <CopyRef refCode={v.ref} style={{fontSize:'10px'}} />
                                    {v.link && <a href={v.link} target="_blank" rel="noreferrer" tabIndex={-1} onClick={e=>e.stopPropagation()} style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',textDecoration:'none',padding:'2px 5px',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'4px'}}>↗</a>}
                                  </div>
                                </div>
                              </div>
                              <span style={{fontSize:'12px',fontWeight:500,color:v.ativa?'#4dcfaa':'rgba(255,255,255,0.3)',textAlign:'right'}}>{(v.preco||0).toFixed(2)} €</span>
                              <button tabIndex={-1} onClick={e=>{e.stopPropagation();delVariante(secao.id,idx,vi)}} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.3)',fontSize:'12px',textAlign:'center'}}>✕</button>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                          </>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            ))}
          </div>
        )}

        <div style={{display:'flex',gap:'8px',marginTop:'0.5rem'}}>
          <input value={novaSecao} onChange={e=>setNovaSecao(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSecao()} placeholder="Nova secção (ex: Cozinha)..." style={{...INPUT,flex:1}}/>
          <button onClick={addSecao} style={BTN_GOLD()}>+ Secção</button>
        </div>
      </div>

      {kitsModal && <EscolherKitModal secao={kitsModal} onSelect={(kit)=>aplicarKit(kitsModal,kit)} onClose={()=>setKitsModal(null)} />}
    </div>
  )
}

function EscolherKitModal({ secao, onSelect, onClose }) {
  const [kits, setKits] = useState([])
  useEffect(() => {
    const u = onSnapshot(collection(db,'kits'), snap => setKits(snap.docs.map(d=>({id:d.id,...d.data()}))))
    return u
  }, [])
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
      <div style={{background:'#161618',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'16px',padding:'1.5rem',width:'420px',maxWidth:'90vw',maxHeight:'70vh',display:'flex',flexDirection:'column',gap:'10px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>Aplicar kit a "{secao.nome}"</span>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'18px',cursor:'pointer'}}>✕</button>
        </div>
        <div style={{overflowY:'auto',display:'flex',flexDirection:'column',gap:'6px'}}>
          {kits.length===0 && <div style={{color:'rgba(255,255,255,0.25)',fontSize:'12px',textAlign:'center',padding:'2rem 0'}}>Nenhum kit criado ainda.</div>}
          {kits.map(kit=>(
            <div key={kit.id} onClick={()=>onSelect(kit)}
              style={{padding:'0.75rem 1rem',borderRadius:'8px',border:'0.5px solid rgba(255,255,255,0.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(80,140,230,0.06)';e.currentTarget.style.borderColor='rgba(80,140,230,0.25)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}}
            >
              <span style={{fontSize:'13px',color:'rgba(255,255,255,0.8)'}}>{kit.nome}</span>
              <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{(kit.itens||[]).length} itens</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
