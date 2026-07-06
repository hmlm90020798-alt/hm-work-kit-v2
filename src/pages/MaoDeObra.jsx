import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase/config'
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, getDocs, writeBatch, getDoc, serverTimestamp } from 'firebase/firestore'
import CopyRef from '../components/CopyRef'
import { MAO_DE_OBRA } from '../data/maoDeObraSeed'

const TIPO_LABEL = { standard:'Standard', visita:'Visita Orç.', opcional:'Opcional' }
const TIPO_COLOR = { standard:'rgba(255,255,255,0.4)', visita:'#7aaff0', opcional:'#C4A96A' }

const TRANSVERSAIS = [
  { ref:'49013101', nome:'Deslocação Instalações', pvp:30, un:'un', tipo:'opcional', seccao:'Transversal', sub:'', inc:'Deslocação até 30km entre a loja e local de instalação', exc:'', cond:'' },
  { ref:'49013106', nome:'Deslocação Manutenção e Reparação', pvp:30, un:'un', tipo:'opcional', seccao:'Transversal', sub:'', inc:'Deslocação até 30km entre a loja e local de instalação', exc:'', cond:'' },
  { ref:'49013102', nome:'KM Extra Instalações', pvp:1, un:'km', tipo:'opcional', seccao:'Transversal', sub:'', inc:'O valor de 1€ por KM extra é calculado apenas na ida, após os 30km', exc:'', cond:'' },
]

const BTN = (extra={}) => ({
  height:'32px', padding:'0 0.875rem', borderRadius:'8px',
  border:'0.5px solid rgba(255,255,255,0.1)',
  background:'rgba(255,255,255,0.04)',
  fontSize:'12px', color:'rgba(255,255,255,0.55)',
  cursor:'pointer', display:'flex', alignItems:'center', gap:'5px',
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
  borderRadius:'8px', padding:'0 0.75rem', height:'34px',
  fontSize:'12px', color:'rgba(255,255,255,0.8)', outline:'none', width:'100%'
}
function f2(n) { return parseFloat(n||0).toFixed(2) }

export default function MaoDeObra() {
  const navigate = useNavigate()
  const [servicos, setServicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('Todos')
  const [seccao, setSeccao] = useState('Todos')
  const [collapsed, setCollapsed] = useState({})
  const [showTrans, setShowTrans] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [orcContexto, setOrcContexto] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orc_contexto')) } catch { return null }
  })
  const [kitContexto, setKitContexto] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kit_contexto')) } catch { return null }
  })
  const [adicionados, setAdicionados] = useState(0)
  const [adicionadosKit, setAdicionadosKit] = useState(0)

  useEffect(() => {
    const u = onSnapshot(collection(db,'mao_obra'), snap => {
      setServicos(snap.docs.map(d=>({id:d.id,...d.data()})))
      setLoading(false)
    })
    return u
  }, [])

  const importarCatalogo = async () => {
    if (!confirm(`Importar ${MAO_DE_OBRA.length} serviços do catálogo oficial? Isto só deve ser feito uma vez.`)) return
    setImportando(true)
    try {
      const chunks = []
      for (let i=0;i<MAO_DE_OBRA.length;i+=400) chunks.push(MAO_DE_OBRA.slice(i,i+400))
      for (const chunk of chunks) {
        const batch = writeBatch(db)
        chunk.forEach(s => {
          const ref = doc(collection(db,'mao_obra'))
          batch.set(ref, { ref:s.id, nome:s.nome, seccao:s.seccao, sub:s.sub||'', pvp:s.pvp, un:s.un, tipo:s.tipo, inc:s.inc||'', exc:s.exc||'', cond:s.cond||'' })
        })
        await batch.commit()
      }
    } catch(e) { console.error(e); alert('Erro ao importar: '+e.message) }
    setImportando(false)
  }

  const seccoes = useMemo(() => ['Todos', ...new Set(servicos.map(s=>s.seccao).filter(Boolean))].sort(), [servicos])

  const filtrados = useMemo(() => servicos.filter(s => {
    const secOk = seccao==='Todos' || s.seccao===seccao
    const tipoOk = tipo==='Todos' || s.tipo===tipo
    const q = search.toLowerCase()
    const srchOk = !q || s.nome?.toLowerCase().includes(q) || s.ref?.includes(q) || (s.sub||'').toLowerCase().includes(q)
    return secOk && tipoOk && srchOk
  }), [servicos, seccao, tipo, search])

  const grupos = useMemo(() => {
    const g = {}
    filtrados.forEach(s => {
      const k = s.sub || '—'
      if (!g[k]) g[k] = []
      g[k].push(s)
    })
    return g
  }, [filtrados])

  const toggleCollapse = (sub) => setCollapsed(c => ({...c, [sub]: !c[sub]}))

  const addToOrc = async (servico, qtyFinal, totalFinal) => {
    if (!orcContexto) return
    const item = { ref: servico.ref, desc: servico.nome + (qtyFinal>1?` (${qtyFinal} ${servico.un})`:''), preco: totalFinal, cat: 'Mão de Obra', sub: servico.seccao, qty: 1 }
    try {
      const orcRef = doc(db,'orcamentos',orcContexto.orcId)
      const snap = await getDoc(orcRef)
      if (!snap.exists()) return
      const secoes = (snap.data().secoes||[]).map(s => s.id===orcContexto.secaoId ? {...s, itens:[...(s.itens||[]), item]} : s)
      await updateDoc(orcRef, { secoes, updatedAt: serverTimestamp() })
      setAdicionados(n=>n+1)
    } catch(e) { console.error(e) }
  }

  const voltarOrcamento = () => {
    localStorage.removeItem('orc_contexto')
    setOrcContexto(null)
    setAdicionados(0)
    navigate('/orcamento')
  }

  const addToKit = async (servico, qtyFinal, totalFinal) => {
    if (!kitContexto) return
    const item = { ref: servico.ref, desc: servico.nome + (qtyFinal>1?` (${qtyFinal} ${servico.un})`:''), preco: totalFinal, tipo: 'mao-de-obra' }
    try {
      const kitRef = doc(db,'kits',kitContexto.kitId)
      const snap = await getDoc(kitRef)
      if (!snap.exists()) return
      const itens = [...(snap.data().itens||[]), item]
      await updateDoc(kitRef, { itens })
      setAdicionadosKit(n=>n+1)
    } catch(e) { console.error(e) }
  }

  const voltarKit = () => {
    localStorage.removeItem('kit_contexto')
    setKitContexto(null)
    setAdicionadosKit(0)
    navigate('/kits')
  }

  const saveServico = async (data) => {
    if (data.id) await updateDoc(doc(db,'mao_obra',data.id), data)
    else await addDoc(collection(db,'mao_obra'), data)
    setEditModal(null)
  }
  const delServico = async (id) => {
    if (!confirm('Eliminar este serviço?')) return
    await deleteDoc(doc(db,'mao_obra',id))
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>

      {kitContexto && (
        <div style={{background:'rgba(80,140,230,0.08)',borderBottom:'0.5px solid rgba(80,140,230,0.2)',padding:'0.5rem 1.25rem',display:'flex',alignItems:'center',gap:'10px',flexShrink:0}}>
          <span style={{fontSize:'12px',color:'#7aaff0',flex:1}}>
            A adicionar ao kit: <strong>{kitContexto.kitNome}</strong>
            {adicionadosKit>0 && <span style={{marginLeft:'8px',fontSize:'11px',background:'rgba(80,140,230,0.2)',padding:'1px 8px',borderRadius:'20px'}}>{adicionadosKit} adicionado{adicionadosKit>1?'s':''}</span>}
          </span>
          <button onClick={voltarKit} style={{height:'28px',padding:'0 0.875rem',borderRadius:'6px',border:'0.5px solid rgba(80,140,230,0.4)',background:'rgba(80,140,230,0.15)',fontSize:'11px',color:'#7aaff0',cursor:'pointer',fontWeight:500}}>← Voltar ao kit</button>
          <button onClick={()=>{localStorage.removeItem('kit_contexto');setKitContexto(null);setAdicionadosKit(0)}} style={{...BTN(),height:'28px'}}>Cancelar</button>
        </div>
      )}
      {orcContexto && (
        <div style={{background:'rgba(196,169,106,0.08)',borderBottom:'0.5px solid rgba(196,169,106,0.2)',padding:'0.5rem 1.25rem',display:'flex',alignItems:'center',gap:'10px',flexShrink:0}}>
          <span style={{fontSize:'12px',color:'#C4A96A',flex:1}}>
            A adicionar para: <strong>{orcContexto.secaoNome}</strong>
            {adicionados>0 && <span style={{marginLeft:'8px',fontSize:'11px',background:'rgba(196,169,106,0.2)',padding:'1px 8px',borderRadius:'20px'}}>{adicionados} adicionado{adicionados>1?'s':''}</span>}
          </span>
          <button onClick={voltarOrcamento} style={BTN_GOLD({height:'28px'})}>← Voltar ao orçamento</button>
          <button onClick={()=>{localStorage.removeItem('orc_contexto');setOrcContexto(null);setAdicionados(0)}} style={{...BTN(),height:'28px'}}>Cancelar</button>
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)'}}>
        <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'0 0.75rem',height:'34px'}}>
          <span style={{color:'rgba(255,255,255,0.25)'}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar serviço ou código..." style={{border:'none',background:'transparent',outline:'none',fontSize:'12px',color:'rgba(255,255,255,0.7)',width:'100%'}}/>
        </div>
        <button onClick={()=>setShowTrans(true)} style={BTN()}>🚚 Deslocação</button>
        <button onClick={()=>setEditModal({})} style={BTN_GOLD()}>+ Serviço</button>
      </div>

      {servicos.length===0 && !loading && (
        <div style={{padding:'1rem 1.25rem',background:'rgba(80,140,230,0.06)',borderBottom:'0.5px solid rgba(80,140,230,0.15)',display:'flex',alignItems:'center',gap:'12px'}}>
          <span style={{fontSize:'12px',color:'rgba(255,255,255,0.5)',flex:1}}>Catálogo vazio. Importa os 580 serviços oficiais para começar.</span>
          <button onClick={importarCatalogo} disabled={importando} style={BTN_GOLD({opacity:importando?0.6:1})}>{importando?'A importar...':'Importar catálogo oficial'}</button>
        </div>
      )}

      <div style={{display:'flex',gap:'6px',padding:'8px 1.25rem',flexShrink:0,borderBottom:'0.5px solid rgba(255,255,255,0.05)'}}>
        {['Todos','standard','visita','opcional'].map(t=>(
          <button key={t} onClick={()=>setTipo(t)} style={{...BTN(tipo===t?{background:'rgba(196,169,106,0.1)',borderColor:'rgba(196,169,106,0.3)',color:'#C4A96A'}:{}),height:'26px',fontSize:'11px',borderRadius:'20px'}}>
            {t==='Todos'?'Todos os tipos':TIPO_LABEL[t]}
          </button>
        ))}
        <span style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',marginLeft:'auto',alignSelf:'center'}}>{filtrados.length} serviços</span>
      </div>

      {seccoes.length>1 && (
        <div style={{display:'flex',gap:'6px',padding:'6px 1.25rem',overflowX:'auto',flexShrink:0,borderBottom:'0.5px solid rgba(255,255,255,0.04)'}}>
          {seccoes.map(s=>(
            <button key={s} onClick={()=>setSeccao(s)} style={{...BTN(seccao===s?{background:'rgba(196,169,106,0.1)',borderColor:'rgba(196,169,106,0.3)',color:'#C4A96A'}:{}),height:'26px',fontSize:'11px',borderRadius:'20px',whiteSpace:'nowrap'}}>
              {s.replace(/^\d+\s*·\s*/,'')}
            </button>
          ))}
        </div>
      )}

      <div style={{flex:1,overflowY:'auto',padding:'1rem 1.25rem'}}>
        {loading ? (
          <div style={{textAlign:'center',padding:'3rem 0',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>A carregar...</div>
        ) : filtrados.length===0 ? (
          <div style={{textAlign:'center',padding:'3rem 0',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>Nenhum serviço encontrado.</div>
        ) : (
          Object.entries(grupos).map(([sub, items])=>{
            const isOpen = !collapsed[sub]
            return (
              <div key={sub} style={{marginBottom:'8px',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'10px',overflow:'hidden'}}>
                <button onClick={()=>toggleCollapse(sub)} style={{width:'100%',display:'flex',alignItems:'center',gap:'8px',padding:'0.6rem 1rem',background:'rgba(255,255,255,0.03)',border:'none',cursor:'pointer',textAlign:'left'}}>
                  <span style={{fontSize:'11px',fontWeight:600,color:'#C4A96A',letterSpacing:'0.06em',textTransform:'uppercase',flex:1}}>{sub}</span>
                  <span style={{fontSize:'10px',color:'rgba(255,255,255,0.3)'}}>{items.length}</span>
                  <span style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',transform:isOpen?'rotate(0deg)':'rotate(-90deg)',transition:'transform 0.2s',display:'inline-block'}}>▾</span>
                </button>
                {isOpen && (
                  <div style={{padding:'6px'}}>
                    {items.map(s=>(
                      <ServicoCard key={s.id} s={s} orcContexto={orcContexto} onAddOrc={addToOrc} kitContexto={kitContexto} onAddKit={addToKit} onEdit={()=>setEditModal(s)} onDel={()=>delServico(s.id)} />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {showTrans && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}} onClick={e=>e.target===e.currentTarget&&setShowTrans(false)}>
          <div style={{background:'#161618',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'16px',padding:'1.5rem',width:'440px',maxWidth:'90vw'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
              <span style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>Códigos Transversais</span>
              <button onClick={()=>setShowTrans(false)} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'18px',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'12px'}}>Deslocação e KM extra — sempre disponíveis</div>
            {TRANSVERSAIS.map(s=>(
              <ServicoCard key={s.ref} s={s} orcContexto={orcContexto} onAddOrc={addToOrc} kitContexto={kitContexto} onAddKit={addToKit} />
            ))}
          </div>
        </div>
      )}

      {editModal!==null && (
        <EditModal servico={editModal} onSave={saveServico} onClose={()=>setEditModal(null)} seccoes={seccoes.filter(s=>s!=='Todos')} />
      )}
    </div>
  )
}

function ServicoCard({ s, orcContexto, onAddOrc, kitContexto, onAddKit, onEdit, onDel }) {
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState('')
  const isMedida = s.un !== 'un'
  const qtyNum = parseFloat(qty)||0
  const total = isMedida && qtyNum>0 ? s.pvp*qtyNum : s.pvp

  const handleAdd = (e) => {
    e.stopPropagation()
    const finalQty = isMedida ? qtyNum : 1
    if (isMedida && finalQty<=0) { alert(`Indica a quantidade em ${s.un} antes de adicionar.`); return }
    onAddOrc(s, finalQty, total)
  }
  const handleAddKit = (e) => {
    e.stopPropagation()
    const finalQty = isMedida ? qtyNum : 1
    if (isMedida && finalQty<=0) { alert(`Indica a quantidade em ${s.un} antes de adicionar.`); return }
    onAddKit(s, finalQty, total)
  }

  return (
    <div onClick={()=>setOpen(o=>!o)}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.055)'}
      onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
      style={{
      background:'rgba(255,255,255,0.02)',
      border:'0.5px solid rgba(255,255,255,0.05)',
      borderLeft: s.tipo==='visita' ? '2px solid #7aaff0' : s.tipo==='opcional' ? '2px solid #C4A96A' : '2px solid rgba(255,255,255,0.1)',
      borderRadius:'8px', padding:'0.65rem 0.875rem', marginBottom:'4px', cursor:'pointer',
      transition:'background 0.1s',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'12px',color:'rgba(255,255,255,0.75)',lineHeight:1.3,marginBottom:'3px',whiteSpace:open?'normal':'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.nome}</div>
          <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
            <span style={{fontSize:'9px',letterSpacing:'0.08em',textTransform:'uppercase',color:TIPO_COLOR[s.tipo]}}>{TIPO_LABEL[s.tipo]||s.tipo}</span>
            <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
            <span style={{fontSize:'10px',color:'rgba(255,255,255,0.3)'}}>{f2(s.pvp)} €/{s.un}</span>
          </div>
        </div>

        <div style={{display:'flex',gap:'6px',alignItems:'center',flexShrink:0}} onClick={e=>e.stopPropagation()}>
          {isMedida && (
            <input type="number" value={qty} onChange={e=>setQty(e.target.value)} onClick={e=>e.stopPropagation()} placeholder={s.un} min="0" step="0.1" style={{width:'64px',...INPUT,height:'28px',fontSize:'11px',textAlign:'right',borderColor:isMedida&&!qty?'rgba(220,100,100,0.3)':'rgba(255,255,255,0.08)'}}/>
          )}
          <CopyRef refCode={s.ref} />
          <PvpCopy val={isMedida&&qtyNum>0?total:s.pvp} />
          {orcContexto && (
            <button onClick={handleAdd} style={{height:'26px',padding:'0 0.7rem',borderRadius:'6px',border:'0.5px solid rgba(196,169,106,0.35)',background:'rgba(196,169,106,0.1)',fontSize:'10.5px',color:'#C4A96A',cursor:'pointer',whiteSpace:'nowrap'}}>+ Orç</button>
          )}
          {kitContexto && (
            <button onClick={handleAddKit} style={{height:'26px',padding:'0 0.7rem',borderRadius:'6px',border:'0.5px solid rgba(80,140,230,0.35)',background:'rgba(80,140,230,0.1)',fontSize:'10.5px',color:'#7aaff0',cursor:'pointer',whiteSpace:'nowrap'}}>+ Kit</button>
          )}
          {onEdit && <button onClick={e=>{e.stopPropagation();onEdit()}} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:'12px',color:'rgba(255,255,255,0.3)',padding:'4px'}}>✎</button>}
          {onDel && <button onClick={e=>{e.stopPropagation();onDel()}} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:'12px',color:'rgba(255,100,100,0.35)',padding:'4px'}}>✕</button>}
        </div>
      </div>

      {open && (s.inc||s.exc||s.cond) && (
        <div style={{marginTop:'8px',paddingTop:'8px',borderTop:'0.5px solid rgba(255,255,255,0.05)',display:'grid',gap:'6px'}}>
          {s.inc && <Detail label="Incluído" text={s.inc} color="rgba(100,200,100,0.7)" />}
          {s.exc && <Detail label="Excluído" text={s.exc} color="rgba(220,100,100,0.7)" />}
          {s.cond && <Detail label="Condições" text={s.cond} color="rgba(196,169,106,0.7)" />}
        </div>
      )}
    </div>
  )
}

function Detail({ label, text, color }) {
  return (
    <div style={{borderLeft:`2px solid ${color}`,paddingLeft:'8px'}}>
      <div style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginBottom:'2px'}}>{label}</div>
      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.45)',lineHeight:1.5,whiteSpace:'pre-line'}}>{text}</div>
    </div>
  )
}

function PvpCopy({ val }) {
  const [copied, setCopied] = useState(false)
  const copy = (e) => { e.stopPropagation(); navigator.clipboard.writeText(f2(val)); setCopied(true); setTimeout(()=>setCopied(false),1200) }
  return (
    <span onClick={copy} style={{fontSize:'12px',fontWeight:600,color:copied?'#4dcfaa':'#C4A96A',background:copied?'rgba(77,207,170,0.1)':'rgba(196,169,106,0.06)',border:copied?'0.5px solid rgba(77,207,170,0.3)':'0.5px solid rgba(196,169,106,0.2)',borderRadius:'6px',padding:'2px 8px',cursor:'pointer',whiteSpace:'nowrap'}}>
      {copied?'✓':f2(val)+' €'}
    </span>
  )
}

function EditModal({ servico, onSave, onClose, seccoes }) {
  const [form, setForm] = useState({
    id: servico?.id||null, ref: servico?.ref||'', nome: servico?.nome||'', seccao: servico?.seccao||seccoes[0]||'',
    sub: servico?.sub||'', pvp: servico?.pvp||'', un: servico?.un||'un', tipo: servico?.tipo||'standard',
    inc: servico?.inc||'', exc: servico?.exc||'', cond: servico?.cond||''
  })
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
      <div style={{background:'#161618',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'16px',padding:'1.5rem',width:'520px',maxWidth:'90vw',maxHeight:'85vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
          <span style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>{form.id?'Editar serviço':'Novo serviço'}</span>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'18px',cursor:'pointer'}}>✕</button>
        </div>
        <div style={{display:'grid',gap:'10px'}}>
          <div style={{display:'grid',gridTemplateColumns:'140px 1fr',gap:'8px'}}>
            <input value={form.ref} onChange={e=>setForm(f=>({...f,ref:e.target.value}))} placeholder="Código" style={INPUT}/>
            <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome do serviço" style={INPUT}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            <input value={form.seccao} onChange={e=>setForm(f=>({...f,seccao:e.target.value}))} placeholder="Secção" style={INPUT}/>
            <input value={form.sub} onChange={e=>setForm(f=>({...f,sub:e.target.value}))} placeholder="Sub-secção" style={INPUT}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
            <input type="number" value={form.pvp} onChange={e=>setForm(f=>({...f,pvp:e.target.value}))} placeholder="PVP €" style={INPUT}/>
            <select value={form.un} onChange={e=>setForm(f=>({...f,un:e.target.value}))} style={{...INPUT,background:'#1a1a1c',cursor:'pointer'}}>
              {['un','m²','ml','km'].map(u=><option key={u} value={u}>{u}</option>)}
            </select>
            <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={{...INPUT,background:'#1a1a1c',cursor:'pointer'}}>
              {Object.entries(TIPO_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {[['inc','Incluído'],['exc','Excluído'],['cond','Condições']].map(([k,l])=>(
            <div key={k}>
              <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>{l}</div>
              <textarea value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} rows={2} style={{...INPUT,height:'auto',padding:'0.5rem 0.75rem',resize:'vertical'}}/>
            </div>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:'8px',marginTop:'1.25rem'}}>
          <button onClick={onClose} style={BTN()}>Cancelar</button>
          <button onClick={()=>onSave({...form,pvp:parseFloat(form.pvp)||0})} style={BTN_GOLD()}>Guardar</button>
        </div>
      </div>
    </div>
  )
}
