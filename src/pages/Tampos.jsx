import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, doc, onSnapshot, setDoc, deleteDoc, addDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ANIGRACO, TRANSPORTE, TIPOS_PEDRA, TIPOS_ALL } from '../data/anigracoData'
import { calcPeca, novoProjeto, totProj, uuid, f2, c1fmt } from '../hooks/useTampos'

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

export default function Tampos() {
  const [calculos, setCalculos] = useState([])
  const [current, setCurrent]   = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  const [matSearch, setMatSearch]   = useState('')
  const [matSort, setMatSort]       = useState('pvp_asc')

  useEffect(() => {
    const u = onSnapshot(collection(db,'tampos'), snap =>
      setCalculos(snap.docs.map(d=>({id:d.id,...d.data()})))
    )
    return u
  }, [])

  const todosOsMateriais = TIPOS_ALL.flatMap(tipo =>
    (ANIGRACO[tipo]?.materiais||[]).map(m=>({...m,tipo}))
  )
  const matsFiltrados = todosOsMateriais
    .filter(m => {
      const tipoOk = filtroTipo==='TODOS' || m.tipo===filtroTipo
      const searchOk = !matSearch || m.desc.toLowerCase().includes(matSearch.toLowerCase())
      return tipoOk && searchOk
    })
    .sort((a,b) => {
      const pvpA = Math.min(...Object.values(a.espessuras).map(e=>e.pvp))
      const pvpB = Math.min(...Object.values(b.espessuras).map(e=>e.pvp))
      return matSort==='pvp_desc' ? pvpB-pvpA : pvpA-pvpB
    })

  const guardarEVoltar = async (dados) => {
    const c = dados || current
    if (c.nome?.trim() || (c.pecas||[]).some(p=>p.desc)) {
      try {
        const data = {...c}; delete data.id
        if (c.id) await setDoc(doc(db,'tampos',c.id), data)
        else { const r = await addDoc(collection(db,'tampos'), data); c.id = r.id }
      } catch(e) { console.error(e) }
    }
    setCurrent(null)
  }

  if (current) return (
    <Calculadora
      current={current}
      setCurrent={setCurrent}
      onBack={guardarEVoltar}
    />
  )

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)'}}>
        <div style={{flex:1,fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.7)'}}>Tampos</div>
        <button onClick={()=>setCurrent(novoProjeto('SILESTONES'))} style={BTN_GOLD()}>+ Novo cálculo</button>
        {calculos.length>0 && (
          <button onClick={async()=>{if(confirm('Limpar todos os cálculos?')) await Promise.all(calculos.map(c=>deleteDoc(doc(db,'tampos',c.id))))}} style={{...BTN(),color:'rgba(255,100,100,0.5)',borderColor:'rgba(255,100,100,0.15)'}}>Limpar tudo</button>
        )}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>

        {/* Cálculos guardados */}
        {calculos.length>0 && (
          <>
            <div style={{fontSize:'10px',letterSpacing:'0.07em',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:'0.75rem'}}>
              Cálculos guardados · {calculos.length}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'6px',marginBottom:'1.5rem'}}>
              {calculos.map(c => {
                const res = totProj(c)
                return (
                  <div key={c.id} onClick={()=>setCurrent({...c})}
                    style={{background:'rgba(255,255,255,0.03)',backdropFilter:'blur(12px)',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'0.875rem 1rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'1rem',transition:'all 0.15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.borderColor='rgba(196,169,106,0.2)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.03)';e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}}
                  >
                    <div style={{flex:1}}>
                      <div style={{fontSize:'13px',fontWeight:500,color:'rgba(255,255,255,0.8)',marginBottom:'2px'}}>{c.nome||'Sem nome'}</div>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{c.tipo}{c.contacto?' · '+c.contacto:''}</div>
                    </div>
                    <span style={{fontSize:'15px',fontWeight:500,color:'#C4A96A'}}>{f2(res.pvp)} €</span>
                    <button onClick={e=>{e.stopPropagation();if(confirm('Eliminar?'))deleteDoc(doc(db,'tampos',c.id))}} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.35)',fontSize:'14px',padding:'4px'}}>✕</button>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Catálogo de materiais */}
        <div style={{fontSize:'10px',letterSpacing:'0.07em',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:'0.75rem'}}>
          Catálogo Anigraco
        </div>

        <div style={{display:'flex',gap:'8px',marginBottom:'0.875rem'}}>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'0 0.75rem',height:'34px'}}>
            <span style={{color:'rgba(255,255,255,0.25)',fontSize:'14px'}}>🔍</span>
            <input value={matSearch} onChange={e=>setMatSearch(e.target.value)} placeholder="Pesquisar material..." style={{border:'none',background:'transparent',outline:'none',fontSize:'12px',color:'rgba(255,255,255,0.7)',width:'100%'}}/>
          </div>
          <select value={matSort} onChange={e=>setMatSort(e.target.value)} style={{height:'34px',padding:'0 0.75rem',borderRadius:'8px',border:'0.5px solid rgba(255,255,255,0.1)',background:'#1a1a1c',color:'rgba(255,255,255,0.65)',fontSize:'11.5px',cursor:'pointer',outline:'none'}}>
            <option value="pvp_asc">Preço ↑</option>
            <option value="pvp_desc">Preço ↓</option>
          </select>
        </div>

        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'0.875rem'}}>
          {['TODOS',...TIPOS_ALL].map(t=>(
            <button key={t} onClick={()=>setFiltroTipo(t)} style={{height:'26px',padding:'0 0.75rem',borderRadius:'20px',border:filtroTipo===t?'0.5px solid rgba(196,169,106,0.4)':'0.5px solid rgba(255,255,255,0.08)',background:filtroTipo===t?'rgba(196,169,106,0.1)':'rgba(255,255,255,0.03)',fontSize:'11px',color:filtroTipo===t?'#C4A96A':'rgba(255,255,255,0.4)',cursor:'pointer'}}>
              {t==='TODOS'?'Todos':t.charAt(0)+t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
          {matsFiltrados.map((m,i)=>(
            <div key={i} onClick={()=>setCurrent(novoProjeto(m.tipo))}
              style={{background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'8px',padding:'0.75rem 1rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'1rem',transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.borderColor='rgba(196,169,106,0.2)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.02)';e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}}
            >
              <div style={{flex:1}}>
                <div style={{fontSize:'12.5px',color:'rgba(255,255,255,0.75)',marginBottom:'2px'}}>{m.desc}</div>
                <div style={{fontSize:'10.5px',color:'rgba(255,255,255,0.28)'}}>{m.tipo}{m.grupo?' · '+m.grupo:''}</div>
              </div>
              <div style={{display:'flex',gap:'12px',flexShrink:0}}>
                {Object.entries(m.espessuras).map(([e,v])=>(
                  <div key={e} style={{textAlign:'right'}}>
                    <div style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',marginBottom:'1px'}}>{e}</div>
                    <div style={{fontSize:'12px',fontWeight:500,color:'#C4A96A'}}>{f2(v.pvp)} €/m²</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Calculadora({ current, setCurrent, onBack }) {
  const [proj, setProj] = useState(current)
  const [matModal, setMatModal] = useState(null) // index da peça a alterar material

  const update = (fn) => setProj(p => { const n={...p}; fn(n); return n })

  const res = totProj(proj)

  const addPeca = () => update(p => {
    const idx = p.pecas.length+1
    p.pecas = [...p.pecas, {id:uuid(),label:`Peça ${idx}`,tipo:p.tipo,desc:'',grupo:null,espessura:'2cm',segmentos:[{id:uuid(),label:'Seg.1',comp:'',larg:''}],acabamentos:[]}]
  })

  const delPeca = (id) => update(p => { p.pecas = p.pecas.filter(pc=>pc.id!==id) })

  const updatePeca = (id, fn) => update(p => {
    p.pecas = p.pecas.map(pc => { if(pc.id!==id) return pc; const n={...pc}; fn(n); return n })
  })

  const addSeg = (pecaId) => updatePeca(pecaId, pc => {
    pc.segmentos = [...(pc.segmentos||[]), {id:uuid(),label:`Seg.${(pc.segmentos||[]).length+1}`,comp:'',larg:''}]
  })

  const delSeg = (pecaId, segId) => updatePeca(pecaId, pc => {
    pc.segmentos = pc.segmentos.filter(s=>s.id!==segId)
  })

  const updateSeg = (pecaId, segId, field, val) => updatePeca(pecaId, pc => {
    pc.segmentos = pc.segmentos.map(s => s.id===segId ? {...s,[field]:val} : s)
  })

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)'}}>
        <button onClick={()=>onBack(proj)} style={BTN()}>← Tampos</button>
        <div style={{flex:1}}>
          <input value={proj.nome||''} onChange={e=>update(p=>{p.nome=e.target.value})} placeholder="Nome do projeto..." style={{border:'none',background:'transparent',outline:'none',fontSize:'13px',fontWeight:500,color:'rgba(255,255,255,0.8)',width:'100%'}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
          <span style={{fontSize:'15px',fontWeight:500,color:'#C4A96A'}}>{f2(res.pvp)} €</span>
          <span style={{fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>C1: {c1fmt(res.c1)}</span>
        </div>
        <button onClick={()=>onBack(proj)} style={BTN_GOLD()}>Guardar</button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>

        {/* Info projeto */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'1.25rem'}}>
          <div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'4px'}}>Contacto</div>
            <input value={proj.contacto||''} onChange={e=>update(p=>{p.contacto=e.target.value})} placeholder="Contacto..." style={INPUT}/>
          </div>
          <div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'4px'}}>Tipo</div>
            <select value={proj.tipo} onChange={e=>update(p=>{p.tipo=e.target.value})} style={{...INPUT,cursor:'pointer'}}>
              {TIPOS_ALL.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Peças */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'1rem'}}>
          {(proj.pecas||[]).map((peca,pi) => {
            const r = calcPeca(peca)
            return (
              <div key={peca.id} style={{background:'rgba(255,255,255,0.025)',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'10px',overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0.6rem 1rem',borderBottom:'0.5px solid rgba(255,255,255,0.05)'}}>
                  <input value={peca.label||''} onChange={e=>updatePeca(peca.id,p=>{p.label=e.target.value})} style={{border:'none',background:'transparent',outline:'none',fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.7)',flex:1}}/>
                  <button onClick={()=>setMatModal(pi)} style={{...BTN(),height:'26px',fontSize:'11px'}}>
                    {peca.desc||'Selecionar material'}
                  </button>
                  <span style={{fontSize:'12px',color:'rgba(255,255,255,0.3)'}}>{f2(r.m2)} m²</span>
                  <span style={{fontSize:'13px',fontWeight:500,color:'#C4A96A'}}>{f2(r.pvp)} €</span>
                  {(proj.pecas||[]).length>1 && <button onClick={()=>delPeca(peca.id)} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.3)',fontSize:'13px'}}>✕</button>}
                </div>

                <div style={{padding:'0.75rem 1rem'}}>
                  {(peca.segmentos||[]).map(seg => (
                    <div key={seg.id} style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 28px',gap:'6px',alignItems:'center',marginBottom:'6px'}}>
                      <input value={seg.label||''} onChange={e=>updateSeg(peca.id,seg.id,'label',e.target.value)} style={{...INPUT,height:'30px',fontSize:'11px'}}/>
                      <input type="number" value={seg.comp||''} onChange={e=>updateSeg(peca.id,seg.id,'comp',e.target.value)} placeholder="Comp" style={{...INPUT,height:'30px',fontSize:'11px'}}/>
                      <input type="number" value={seg.larg||''} onChange={e=>updateSeg(peca.id,seg.id,'larg',e.target.value)} placeholder="Larg" style={{...INPUT,height:'30px',fontSize:'11px'}}/>
                      {(peca.segmentos||[]).length>1 && <button onClick={()=>delSeg(peca.id,seg.id)} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.3)',fontSize:'13px',textAlign:'center'}}>✕</button>}
                    </div>
                  ))}
                  <button onClick={()=>addSeg(peca.id)} style={{...BTN(),height:'26px',fontSize:'11px',marginTop:'4px'}}>+ Segmento</button>
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={addPeca} style={BTN_GOLD()}>+ Peça</button>

        {/* Transporte */}
        <div style={{marginTop:'1.25rem',background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'0.75rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>Transporte</div>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            <button onClick={()=>update(p=>{p.transporte=null})} style={{...BTN(proj.transporte===null?{background:'rgba(196,169,106,0.1)',borderColor:'rgba(196,169,106,0.3)',color:'#C4A96A'}:{}),height:'28px',fontSize:'11px',borderRadius:'20px'}}>Sem transporte</button>
            {TRANSPORTE.map(t=>(
              <button key={t.label} onClick={()=>update(p=>{p.transporte=t})}
                style={{...BTN(proj.transporte?.label===t.label?{background:'rgba(196,169,106,0.1)',borderColor:'rgba(196,169,106,0.3)',color:'#C4A96A'}:{}),height:'28px',fontSize:'11px',borderRadius:'20px'}}>
                {t.label} — {f2(t.pvp)} €
              </button>
            ))}
          </div>
        </div>

        {/* Desconto */}
        <div style={{marginTop:'10px',background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'0.75rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>Desconto</div>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <input type="number" value={proj.desconto||''} onChange={e=>update(p=>{p.desconto=e.target.value})} placeholder="0" style={{...INPUT,width:'100px'}}/>
            <select value={proj.descontoTipo||'%'} onChange={e=>update(p=>{p.descontoTipo=e.target.value})} style={{height:'34px',padding:'0 0.75rem',borderRadius:'8px',border:'0.5px solid rgba(255,255,255,0.1)',background:'#1a1a1c',color:'rgba(255,255,255,0.65)',fontSize:'12px',cursor:'pointer',outline:'none'}}>
              <option value="%">%</option>
              <option value="€">€</option>
            </select>
          </div>
        </div>

        {/* Resumo */}
        <div style={{marginTop:'10px',background:'rgba(196,169,106,0.05)',border:'0.5px solid rgba(196,169,106,0.2)',borderRadius:'10px',padding:'1rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Total</div>
            <div style={{fontSize:'20px',fontWeight:600,color:'#C4A96A'}}>{f2(res.pvp)} €</div>
          </div>
          <CopyVal val={c1fmt(res.c1)} label="C1" />
        </div>
      </div>

      {matModal!==null && (
        <MaterialModal
          tipoProjeto={proj.tipo}
          onSelect={(tipo,desc,grupo,esp)=>{
            updatePeca(proj.pecas[matModal].id, p=>{p.tipo=tipo;p.desc=desc;p.grupo=grupo;p.espessura=esp})
            setMatModal(null)
          }}
          onClose={()=>setMatModal(null)}
        />
      )}
    </div>
  )
}

function MaterialModal({ tipoProjeto, onSelect, onClose }) {
  const [tipo, setTipo] = useState(TIPOS_PEDRA.includes(tipoProjeto)?tipoProjeto:'SILESTONES')
  const [search, setSearch] = useState('')
  const mat = ANIGRACO[tipo]
  const lista = mat.materiais.filter(m => !search || m.desc.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
      <div style={{background:'#161618',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'16px',padding:'1.5rem',width:'480px',maxWidth:'90vw',maxHeight:'80vh',display:'flex',flexDirection:'column',gap:'1rem'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>Selecionar material</span>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'18px',cursor:'pointer'}}>✕</button>
        </div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          {TIPOS_PEDRA.map(t=>(
            <button key={t} onClick={()=>{setTipo(t);setSearch('')}} style={{height:'26px',padding:'0 0.75rem',borderRadius:'20px',border:tipo===t?'0.5px solid rgba(196,169,106,0.4)':'0.5px solid rgba(255,255,255,0.08)',background:tipo===t?'rgba(196,169,106,0.1)':'rgba(255,255,255,0.03)',fontSize:'11px',color:tipo===t?'#C4A96A':'rgba(255,255,255,0.4)',cursor:'pointer'}}>
              {t.charAt(0)+t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar..." style={{background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'0 0.75rem',height:'34px',fontSize:'12px',color:'rgba(255,255,255,0.8)',outline:'none'}}/>
        <div style={{overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:'3px'}}>
          {lista.map((m,i)=>(
            <div key={i} onClick={()=>onSelect(tipo,m.desc,m.grupo,Object.keys(m.espessuras)[0])}
              style={{padding:'0.75rem',borderRadius:'8px',border:'0.5px solid rgba(255,255,255,0.05)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.borderColor='rgba(196,169,106,0.2)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'}}
            >
              <div>
                <div style={{fontSize:'12.5px',color:'rgba(255,255,255,0.8)',marginBottom:'2px'}}>{m.desc}</div>
                {m.grupo&&<div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)'}}>Grupo {m.grupo}</div>}
              </div>
              <div style={{display:'flex',gap:'10px'}}>
                {Object.entries(m.espessuras).map(([e,v])=>(
                  <div key={e} style={{textAlign:'right'}}>
                    <div style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',marginBottom:'1px'}}>{e}</div>
                    <div style={{fontSize:'12px',fontWeight:500,color:'#C4A96A'}}>{f2(v.pvp)} €/m²</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CopyVal({ val, label }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(val)
    setCopied(true)
    setTimeout(()=>setCopied(false), 1500)
  }
  return (
    <div style={{textAlign:'right'}}>
      <div style={{fontSize:'10px',color:'rgba(255,255,255,0.25)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</div>
      <button onClick={copy} style={{background:copied?'rgba(77,207,170,0.1)':'rgba(255,255,255,0.04)',border:copied?'0.5px solid rgba(77,207,170,0.3)':'0.5px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'4px 12px',fontSize:'15px',fontWeight:600,color:copied?'#4dcfaa':'rgba(255,255,255,0.7)',cursor:'pointer',fontFamily:'monospace',transition:'all 0.2s'}}>
        {copied?'✓ copiado':val} {!copied&&<span style={{fontSize:'11px',opacity:0.5}}>⎘</span>}
      </button>
    </div>
  )
}
