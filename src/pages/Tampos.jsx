import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, doc, onSnapshot, setDoc, deleteDoc, addDoc } from 'firebase/firestore'
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
const BTN_BLUE = (extra={}) => BTN({
  background:'rgba(74,143,168,0.12)',
  border:'0.5px solid rgba(74,143,168,0.35)',
  color:'#4a8fa8', ...extra
})
const INPUT = {
  background:'rgba(255,255,255,0.04)',
  border:'0.5px solid rgba(255,255,255,0.08)',
  borderRadius:'8px', padding:'0 0.75rem', height:'34px',
  fontSize:'12px', color:'rgba(255,255,255,0.8)', outline:'none', width:'100%'
}
const INPUT_NUM = { ...INPUT, width:'80px', textAlign:'right' }

const REF_ANIGRACO = '207849'

function totGeral(pecas, transporte, desconto, descontoTipo) {
  let pvp = 0, c1 = 0
  ;(pecas||[]).forEach(p => { const r = calcPeca(p); pvp += r.pvp; c1 += r.c1raw })
  if (transporte) { pvp += transporte.pvp; c1 += transporte.c1 }
  const desc = parseFloat(desconto) > 0
    ? (descontoTipo === '%' ? pvp * (parseFloat(desconto)/100) : parseFloat(desconto))
    : 0
  return { pvp: pvp - desc, c1, desc, pvpBruto: pvp }
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
      const searchOk = !matSearch || m.desc.toLowerCase().includes(matSearch.toLowerCase()) || (m.grupo||'').toLowerCase().includes(matSearch.toLowerCase())
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
        else await addDoc(collection(db,'tampos'), data)
      } catch(e) { console.error(e) }
    }
    setCurrent(null)
  }

  if (current) return (
    <Calculadora current={current} setCurrent={setCurrent} onBack={guardarEVoltar} />
  )

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)'}}>
        <div style={{flex:1,fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.7)'}}>Tampos</div>
        <AnigracoRef />
        <button onClick={()=>setCurrent(novoProjeto('SILESTONES'))} style={BTN_GOLD()}>+ Novo cálculo</button>
        {calculos.length>0 && <button onClick={async()=>{if(confirm('Limpar todos?')) await Promise.all(calculos.map(c=>deleteDoc(doc(db,'tampos',c.id))))}} style={{...BTN(),color:'rgba(255,100,100,0.5)',borderColor:'rgba(255,100,100,0.15)'}}>Limpar tudo</button>}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>
        {calculos.length>0 && <>
          <div style={{fontSize:'10px',letterSpacing:'0.07em',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:'0.75rem'}}>Cálculos guardados · {calculos.length}</div>
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
        </>}

        <div style={{fontSize:'10px',letterSpacing:'0.07em',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:'0.75rem'}}>Catálogo Anigraco</div>

        <div style={{display:'flex',gap:'8px',marginBottom:'0.875rem'}}>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'0 0.75rem',height:'34px'}}>
            <span style={{color:'rgba(255,255,255,0.25)'}}>🔍</span>
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
          {matsFiltrados.map((m,i)=>{
            const esps = Object.entries(m.espessuras)
            const pvpMin = Math.min(...esps.map(([,v])=>v.pvp))
            const pvpMax = Math.max(...esps.map(([,v])=>v.pvp))
            return (
              <div key={i}
                style={{background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'8px',padding:'0.75rem 1rem',display:'flex',alignItems:'center',gap:'1rem',transition:'all 0.15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.borderColor='rgba(196,169,106,0.2)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.02)';e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}}
              >
                <div style={{flex:1}}>
                  <div style={{fontSize:'12.5px',color:'rgba(255,255,255,0.75)',marginBottom:'3px'}}>{m.desc}</div>
                  <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                    <span style={{fontSize:'10px',padding:'1px 7px',borderRadius:'20px',background:'rgba(196,169,106,0.08)',color:'rgba(196,169,106,0.6)'}}>{m.tipo.charAt(0)+m.tipo.slice(1).toLowerCase()}</span>
                    {m.grupo&&<span style={{fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>Grupo {m.grupo}</span>}
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:'13px',fontWeight:500,color:'#C4A96A'}}>{pvpMin===pvpMax?f2(pvpMin):`${f2(pvpMin)}–${f2(pvpMax)}`} €/m²</div>
                  <div style={{fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>{esps.map(([e])=>e).join(' · ')}</div>
                </div>
                <button onClick={()=>{const p=novoProjeto(m.tipo);p.pecas[0].desc=m.desc;p.pecas[0].grupo=m.grupo;setCurrent(p)}} style={BTN()}>Calcular</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Calculadora({ current, setCurrent, onBack }) {
  const [tab, setTab]           = useState('pecas')
  const [matModal, setMatModal] = useState(null)
  const [formulaOpen, setFormulaOpen] = useState(false)
  const [margem, setMargem]     = useState(25)

  const upd = (k,v) => setCurrent(c=>({...c,[k]:v}))
  const updPeca = (id,k,v) => upd('pecas', current.pecas.map(p=>p.id===id?{...p,[k]:v}:p))
  const addPeca = () => { const n=(current.pecas||[]).length+1; upd('pecas',[...current.pecas,{id:uuid(),label:`Peça ${n}`,tipo:current.tipo,desc:'',grupo:null,espessura:'2cm',segmentos:[{id:uuid(),label:'Seg.1',comp:'',larg:''}],acabamentos:[]}]) }
  const delPeca = (id) => upd('pecas', current.pecas.filter(p=>p.id!==id))
  const addSeg  = (pid) => { const p=current.pecas.find(x=>x.id===pid);const n=(p.segmentos||[]).length+1;updPeca(pid,'segmentos',[...(p.segmentos||[]),{id:uuid(),label:`Seg.${n}`,comp:'',larg:''}]) }
  const updSeg  = (pid,sid,k,v) => { const p=current.pecas.find(x=>x.id===pid);updPeca(pid,'segmentos',p.segmentos.map(s=>s.id===sid?{...s,[k]:v}:s)) }
  const delSeg  = (pid,sid) => { const p=current.pecas.find(x=>x.id===pid);updPeca(pid,'segmentos',p.segmentos.filter(s=>s.id!==sid)) }
  const toggleAcab = (pid,acab) => { const p=current.pecas.find(x=>x.id===pid);const ex=(p.acabamentos||[]).find(a=>a.nome===acab.nome);updPeca(pid,'acabamentos',ex?(p.acabamentos||[]).filter(a=>a.nome!==acab.nome):[...(p.acabamentos||[]),{...acab,qty:''}]) }
  const updAcabQty = (pid,nome,qty) => { const p=current.pecas.find(x=>x.id===pid);updPeca(pid,'acabamentos',(p.acabamentos||[]).map(a=>a.nome===nome?{...a,qty}:a)) }

  const activarCompB = () => {
    const pecasB = current.pecas.map(p=>({...p,id:uuid(),desc:'',grupo:null,espessura:'2cm',acabamentos:[...p.acabamentos]}))
    upd('opcaoB', {pecas:pecasB,tipo:current.tipo})
  }
  const updPecaB = (id,k,v) => upd('opcaoB',{...current.opcaoB,pecas:(current.opcaoB?.pecas||[]).map(p=>p.id===id?{...p,[k]:v}:p)})

  const TA = totGeral(current.pecas, current.transporte, current.desconto, current.descontoTipo)
  const TB = current.opcaoB ? totGeral(current.opcaoB?.pecas, current.transporte, current.desconto, current.descontoTipo) : null

  const save = async () => {
    const data = {...current}; delete data.id
    if (current.id) await setDoc(doc(db,'tampos',current.id), data)
    else { const r = await addDoc(collection(db,'tampos'),data); setCurrent(c=>({...c,id:r.id})) }
  }

  const actualizarAcabamentos = (acabamentosActuais, tipo) => {
    const novoMat = ANIGRACO[tipo]
    const novosAcabDisp = novoMat?.acabamentos||[]
    if (!acabamentosActuais||acabamentosActuais.length===0) return []
    return acabamentosActuais.map(a=>{
      const equiv = novosAcabDisp.find(x=>x.nome===a.nome)
      return equiv ? {...a,pvp:equiv.pvp,c1:equiv.c1,unidade:equiv.unidade} : null
    }).filter(Boolean)
  }

  const renderPeca = (p, isB) => {
    const mat = ANIGRACO[p.tipo]
    const matRef = mat?.materiais.find(m=>m.desc===p.desc&&m.grupo===p.grupo)||mat?.materiais.find(m=>m.desc===p.desc)
    const acabDisp = mat?.acabamentos||[]
    const res = calcPeca(p)
    const accentColor = isB ? '#4a8fa8' : '#C4A96A'
    const accentBg = isB ? 'rgba(74,143,168,0.1)' : 'rgba(196,169,106,0.1)'
    const accentBorder = isB ? 'rgba(74,143,168,0.3)' : 'rgba(196,169,106,0.3)'

    return (
      <div key={p.id} style={{background:'rgba(255,255,255,0.02)',border:`0.5px solid rgba(255,255,255,0.06)`,borderRadius:'10px',overflow:'hidden',marginBottom:'8px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0.6rem 1rem',borderBottom:'0.5px solid rgba(255,255,255,0.05)'}}>
          <input value={p.label||''} onChange={e=>isB?updPecaB(p.id,'label',e.target.value):updPeca(p.id,'label',e.target.value)} style={{border:'none',background:'transparent',outline:'none',fontSize:'12px',fontWeight:500,color:accentColor,flex:1}}/>
          <button onClick={()=>setMatModal(isB?'B':p.id)} style={{...BTN(),height:'26px',fontSize:'11px',borderColor:accentBorder,color:accentColor}}>
            {p.desc||'Selecionar material'}
          </button>
          {matRef?.espessuras && (
            <select value={p.espessura||'2cm'} onChange={e=>isB?updPecaB(p.id,'espessura',e.target.value):updPeca(p.id,'espessura',e.target.value)} style={{height:'26px',padding:'0 0.5rem',borderRadius:'6px',border:`0.5px solid ${accentBorder}`,background:'#1a1a1c',color:accentColor,fontSize:'11px',cursor:'pointer',outline:'none'}}>
              {Object.keys(matRef.espessuras).map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          )}
          <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{f2(res.m2)} m²</span>
          <span style={{fontSize:'13px',fontWeight:500,color:accentColor}}>{f2(res.pvp)} €</span>
          {!isB && current.pecas.length>1 && <button onClick={()=>delPeca(p.id)} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.3)',fontSize:'13px'}}>✕</button>}
        </div>

        <div style={{padding:'0.75rem 1rem'}}>
          <div style={{fontSize:'10px',color:'rgba(255,255,255,0.25)',marginBottom:'8px',letterSpacing:'0.05em',textTransform:'uppercase'}}>Segmentos (metros)</div>
          {(p.segmentos||[]).map(seg=>(
            <div key={seg.id} style={{display:'grid',gridTemplateColumns:'1fr 120px 120px 70px 24px',gap:'8px',alignItems:'center',marginBottom:'8px'}}>
              <input value={seg.label||''} onChange={e=>isB?null:updSeg(p.id,seg.id,'label',e.target.value)} style={{...INPUT,height:'38px',fontSize:'12px'}}/>
              <input type="number" value={seg.comp||''} onChange={e=>isB?null:updSeg(p.id,seg.id,'comp',e.target.value)} placeholder="Comp. (m)" step="0.01" style={{...INPUT,height:'38px',fontSize:'13px',fontWeight:500,textAlign:'right'}}/>
              <input type="number" value={seg.larg||''} onChange={e=>isB?null:updSeg(p.id,seg.id,'larg',e.target.value)} placeholder="Larg. (m)" step="0.01" style={{...INPUT,height:'38px',fontSize:'13px',fontWeight:500,textAlign:'right'}}/>
              <div style={{textAlign:'right',fontSize:'15px',fontWeight:600,color:accentColor}}>{f2((parseFloat(seg.comp)||0)*(parseFloat(seg.larg)||0))}</div>
              {(p.segmentos||[]).length>1&&!isB&&<button onClick={()=>delSeg(p.id,seg.id)} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.3)',fontSize:'13px'}}>✕</button>}
            </div>
          ))}
          {!isB && <button onClick={()=>addSeg(p.id)} style={{...BTN(),height:'24px',fontSize:'10px',marginTop:'4px'}}>+ Seg.</button>}

          {/* Acabamentos */}
          {acabDisp.length>0 && (
            <div style={{marginTop:'10px',borderTop:'0.5px solid rgba(255,255,255,0.05)',paddingTop:'10px'}}>
              <div style={{fontSize:'10px',color:'rgba(255,255,255,0.25)',marginBottom:'6px',letterSpacing:'0.05em',textTransform:'uppercase'}}>Acabamentos</div>
              {acabDisp.map(acab=>{
                const active = (p.acabamentos||[]).find(a=>a.nome===acab.nome)
                return (
                  <div key={acab.nome} style={{display:'flex',alignItems:'center',gap:'10px',padding:'5px 0',borderBottom:'0.5px solid rgba(255,255,255,0.04)'}}>
                    <div onClick={()=>!isB&&toggleAcab(p.id,acab)} style={{width:'28px',height:'16px',borderRadius:'8px',background:active?accentBg:'rgba(255,255,255,0.06)',border:`0.5px solid ${active?accentBorder:'rgba(255,255,255,0.1)'}`,cursor:'pointer',position:'relative',transition:'all 0.2s',flexShrink:0}}>
                      <div style={{position:'absolute',top:'2px',left:active?'14px':'2px',width:'10px',height:'10px',borderRadius:'50%',background:active?accentColor:'rgba(255,255,255,0.3)',transition:'left 0.2s'}}/>
                    </div>
                    <span style={{flex:1,fontSize:'11.5px',color:active?'rgba(255,255,255,0.75)':'rgba(255,255,255,0.35)'}}>{acab.nome}</span>
                    {active ? (
                      <>
                        <input type="number" value={active.qty||''} onChange={e=>!isB&&updAcabQty(p.id,acab.nome,e.target.value)} placeholder="0" style={{...INPUT_NUM,height:'28px',fontSize:'11px',width:'70px'}}/>
                        <span style={{fontSize:'10px',color:'rgba(255,255,255,0.3)'}}>{acab.unidade}</span>
                        {(parseFloat(active.qty)||0)>0&&<span style={{fontSize:'12px',color:accentColor,minWidth:'50px',textAlign:'right'}}>{f2(acab.pvp*(parseFloat(active.qty)||0))} €</span>}
                      </>
                    ) : (
                      <span style={{fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>{f2(acab.pvp)} €/{acab.unidade}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      {/* Topbar */}
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)'}}>
        <button onClick={()=>onBack(current)} style={BTN()}>← Tampos</button>
        <input value={current.nome||''} onChange={e=>upd('nome',e.target.value)} placeholder="Nome do projeto..." style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:'13px',fontWeight:500,color:'rgba(255,255,255,0.8)'}}/>
        <div style={{display:'flex',gap:'16px',alignItems:'center'}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'1px'}}>{current.opcaoB?'Opção A':''}</div>
            <div style={{fontSize:'16px',fontWeight:600,color:'#C4A96A'}}>{f2(TA.pvp)} €</div>
          </div>
          {TB && <>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'1px'}}>Opção B</div>
              <div style={{fontSize:'16px',fontWeight:600,color:'#4a8fa8'}}>{f2(TB.pvp)} €</div>
            </div>
            <div style={{textAlign:'center',fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>
              <div>Δ</div>
              <div style={{fontSize:'13px',fontWeight:600,color:TA.pvp<TB.pvp?'#C4A96A':'rgba(255,255,255,0.5)'}}>{f2(Math.abs(TA.pvp-TB.pvp))} €</div>
            </div>
          </>}
        </div>
        <AnigracoRef />
        <button onClick={()=>current.opcaoB?upd('opcaoB',null):activarCompB()} style={current.opcaoB?BTN_BLUE():BTN()}>
          {current.opcaoB?'Modo simples':'Comparar'}
        </button>
        <button onClick={save} style={BTN_GOLD()}>Guardar</button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'0',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        {[['pecas','Peças'],['resumo','Referências']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'0.6rem 1.25rem',fontSize:'12px',fontWeight:500,color:tab===k?'#C4A96A':'rgba(255,255,255,0.4)',background:'transparent',border:'none',cursor:'pointer',borderBottom:tab===k?'1px solid #C4A96A':'1px solid transparent',marginBottom:'-0.5px'}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>
        {tab==='pecas' && <>
          {/* Info */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'1rem'}}>
            <div>
              <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'4px'}}>Contacto</div>
              <input value={current.contacto||''} onChange={e=>upd('contacto',e.target.value)} placeholder="Nome / telefone" style={INPUT}/>
            </div>
            <div>
              <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'4px'}}>Tipo</div>
              <select value={current.tipo} onChange={e=>upd('tipo',e.target.value)} style={{...INPUT,cursor:'pointer',height:'34px',background:'#1a1a1c'}}>
                {TIPOS_ALL.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Fórmula */}
          <div style={{marginBottom:'1rem'}}>
            <button onClick={()=>setFormulaOpen(o=>!o)} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:'11px',color:'rgba(196,169,106,0.7)',letterSpacing:'0.06em',display:'flex',alignItems:'center',gap:'6px',padding:'0'}}>
              <span>{formulaOpen?'▼':'▶'}</span> Fórmula PVP
            </button>
            {formulaOpen && <FormulaPanel margem={margem} setMargem={setMargem} c1Auto={TA.c1} />}
          </div>

          {/* Peças — modo simples ou comparação */}
          {!current.opcaoB ? (
            <>
              {(current.pecas||[]).map(p=>renderPeca(p,false))}
              <button onClick={addPeca} style={BTN_GOLD()}>+ Peça</button>
            </>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <div style={{fontSize:'10px',fontWeight:600,color:'#C4A96A',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'8px',padding:'6px 10px',background:'rgba(196,169,106,0.06)',borderRadius:'6px',border:'0.5px solid rgba(196,169,106,0.2)'}}>Opção A</div>
                {(current.pecas||[]).map(p=>renderPeca(p,false))}
              </div>
              <div>
                <div style={{fontSize:'10px',fontWeight:600,color:'#4a8fa8',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'8px',padding:'6px 10px',background:'rgba(74,143,168,0.06)',borderRadius:'6px',border:'0.5px solid rgba(74,143,168,0.2)'}}>Opção B</div>
                {(current.opcaoB?.pecas||[]).map(p=>renderPeca(p,true))}
              </div>
            </div>
          )}

          {/* Transporte */}
          <div style={{marginTop:'1rem',background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'1rem'}}>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'0.75rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>Transporte e Montagem</div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {TRANSPORTE.map(t=>(
                <button key={t.label} onClick={()=>upd('transporte',current.transporte?.label===t.label?null:t)}
                  style={{padding:'8px 12px',borderRadius:'8px',border:current.transporte?.label===t.label?'0.5px solid rgba(196,169,106,0.4)':'0.5px solid rgba(255,255,255,0.08)',background:current.transporte?.label===t.label?'rgba(196,169,106,0.1)':'rgba(255,255,255,0.03)',cursor:'pointer',textAlign:'center'}}>
                  <div style={{fontSize:'12px',fontWeight:500,color:current.transporte?.label===t.label?'#C4A96A':'rgba(255,255,255,0.6)'}}>{t.label}</div>
                  <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginTop:'2px'}}>{f2(t.pvp)} €</div>
                </button>
              ))}
            </div>
          </div>

          {/* Desconto */}
          {!current.opcaoB && (
            <div style={{marginTop:'8px',background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'1rem'}}>
              <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'0.75rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>Desconto</div>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <input type="number" value={current.desconto||''} onChange={e=>upd('desconto',e.target.value)} placeholder="0" style={{...INPUT,width:'100px'}}/>
                {['%','€'].map(t=>(
                  <button key={t} onClick={()=>upd('descontoTipo',t)} style={{height:'34px',padding:'0 0.75rem',borderRadius:'8px',border:current.descontoTipo===t?'0.5px solid rgba(196,169,106,0.4)':'0.5px solid rgba(255,255,255,0.08)',background:current.descontoTipo===t?'rgba(196,169,106,0.1)':'rgba(255,255,255,0.03)',fontSize:'13px',color:current.descontoTipo===t?'#C4A96A':'rgba(255,255,255,0.4)',cursor:'pointer'}}>{t}</button>
                ))}
                {parseFloat(current.desconto)>0 && <span style={{fontSize:'12px',color:'rgba(255,255,255,0.35)',marginLeft:'auto'}}>− {f2(TA.desc)} €</span>}
              </div>
            </div>
          )}

          {/* Notas */}
          <div style={{marginTop:'8px'}}>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'4px'}}>Notas</div>
            <textarea value={current.notas||''} onChange={e=>upd('notas',e.target.value)} placeholder="Observações..." style={{...INPUT,height:'auto',minHeight:'60px',padding:'0.5rem 0.75rem',resize:'vertical'}}/>
          </div>
        </>}

        {/* Tab Referências */}
        {tab==='resumo' && (
          <div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.25)',marginBottom:'1rem',letterSpacing:'0.06em'}}>Referências copiáveis para o programa de orçamentação</div>

            {(current.pecas||[]).map(p=>{
              const mat = ANIGRACO[p.tipo]
              const matRef = mat?.materiais.find(m=>m.desc===p.desc&&m.grupo===p.grupo)||mat?.materiais.find(m=>m.desc===p.desc)
              const esp = matRef?.espessuras[p.espessura]
              const acabDisp = mat?.acabamentos||[]
              const res = calcPeca(p)
              if (!p.desc && TIPOS_PEDRA.includes(p.tipo)) return null
              return (
                <div key={p.id} style={{marginBottom:'1rem'}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'#C4A96A',letterSpacing:'0.08em',marginBottom:'6px'}}>{p.label}{p.desc?' — '+p.desc:''}{p.espessura?' '+p.espessura:''}</div>
                  {esp && <RefRow label="Tampo / m²" c1={esp.c1} pvp={esp.pvp} refAnigraco={esp.refAnigraco||null} calc={res.m2>0?`${res.m2.toFixed(3)} m² × ${f2(esp.pvp)} = ${f2(res.pvpTampo)} €`:null}/>}
                  {(p.acabamentos||[]).map(a=>{
                    const base = acabDisp.find(x=>x.nome===a.nome)
                    if (!base) return null
                    const qty = base.unidade==='ml'?parseFloat(a.qty)||0:parseInt(a.qty)||0
                    return <RefRow key={a.nome} label={a.nome} c1={base.c1} pvp={base.pvp} unidade={base.unidade} refAnigraco={base.refAnigraco||null} calc={qty>0?`${qty} ${base.unidade} = ${f2(base.pvp*qty)} €`:null}/>
                  })}
                </div>
              )
            })}

            {current.opcaoB && (current.opcaoB?.pecas||[]).map(p=>{
              const mat = ANIGRACO[p.tipo]
              const matRef = mat?.materiais.find(m=>m.desc===p.desc&&m.grupo===p.grupo)||mat?.materiais.find(m=>m.desc===p.desc)
              const esp = matRef?.espessuras[p.espessura]
              const acabDisp = mat?.acabamentos||[]
              const res = calcPeca(p)
              if (!p.desc) return null
              return (
                <div key={p.id} style={{marginBottom:'1rem'}}>
                  <div style={{fontSize:'11px',fontWeight:600,color:'#4a8fa8',letterSpacing:'0.08em',marginBottom:'6px'}}>B: {p.label}{p.desc?' — '+p.desc:''}{p.espessura?' '+p.espessura:''}</div>
                  {esp && <RefRow label="Tampo / m²" c1={esp.c1} pvp={esp.pvp} refAnigraco={esp.refAnigraco||null} calc={res.m2>0?`${res.m2.toFixed(3)} m² × ${f2(esp.pvp)} = ${f2(res.pvpTampo)} €`:null} isB/>}
                </div>
              )
            })}

            {current.transporte && <>
              <div style={{fontSize:'11px',fontWeight:600,color:'rgba(255,255,255,0.5)',letterSpacing:'0.08em',marginBottom:'6px',marginTop:'1rem'}}>Transporte</div>
              <RefRow label={current.transporte.label} c1={current.transporte.c1} pvp={current.transporte.pvp}/>
            </>}

            <div style={{marginTop:'1.25rem',background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'1rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              {current.opcaoB ? <>
                <div><div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'4px'}}>Total PVP — Opção A</div><div style={{fontSize:'20px',fontWeight:700,color:'#C4A96A'}}>{f2(TA.pvp)} €</div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'4px'}}>Total PVP — Opção B</div><div style={{fontSize:'20px',fontWeight:700,color:'#4a8fa8'}}>{f2(TB.pvp)} €</div></div>
              </> : <>
                <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)'}}>Total PVP</div>
                <div style={{fontSize:'22px',fontWeight:700,color:'#C4A96A'}}>{f2(TA.pvp)} €</div>
              </>}
            </div>
          </div>
        )}
      </div>

      {matModal && (
        <MaterialModal
          tipoProjeto={current.tipo}
          onSelect={(tipo,desc,grupo,espessura)=>{
            if (matModal==='B') {
              const pecaB = (current.opcaoB?.pecas||[])[0]
              upd('opcaoB',{...current.opcaoB,pecas:(current.opcaoB?.pecas||[]).map((p,i)=>i===0?{...p,tipo,desc,grupo,espessura,acabamentos:actualizarAcabamentos(p.acabamentos,tipo)}:p)})
            } else {
              upd('pecas',current.pecas.map(p=>p.id===matModal?{...p,tipo,desc,grupo,espessura,acabamentos:actualizarAcabamentos(p.acabamentos,tipo)}:p))
            }
            setMatModal(null)
          }}
          onClose={()=>setMatModal(null)}
        />
      )}
    </div>
  )
}

function RefRow({ label, c1, pvp, unidade, refAnigraco, calc, isB }) {
  const accentColor = isB ? '#4a8fa8' : '#C4A96A'
  return (
    <div style={{display:'flex',alignItems:'center',padding:'9px 14px',borderBottom:'0.5px solid rgba(255,255,255,0.04)',gap:'12px'}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
          <span style={{fontSize:'12px',color:'rgba(255,255,255,0.75)',fontWeight:500}}>{label}</span>
          {unidade && <span style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.05)',padding:'1px 6px',borderRadius:'4px'}}>{unidade}</span>}
          {refAnigraco && <div style={{display:'flex',alignItems:'center',gap:'5px'}}><span style={{fontSize:'9px',color:'rgba(255,255,255,0.2)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Anigraco</span><CopyVal val={refAnigraco} label="Ref Anigraco" small /></div>}
        </div>
        {calc && <div style={{fontSize:'12px',color:accentColor,marginTop:'3px'}}>{calc.split(' × ')[0].split(' = ')[0]}</div>}
      </div>
      <div style={{display:'flex',alignItems:'flex-start',gap:'8px',flexShrink:0}}>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',marginBottom:'3px',letterSpacing:'0.08em',textTransform:'uppercase'}}>C1</div>
          <CopyVal val={c1fmt(c1)} label="C1" small />
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',marginBottom:'3px',letterSpacing:'0.08em',textTransform:'uppercase'}}>PVP</div>
          <CopyVal val={f2(pvp)} label="PVP" gold small />
          {calc && <div style={{fontSize:'10px',color:'rgba(255,255,255,0.28)',marginTop:'3px',whiteSpace:'nowrap'}}>{calc}</div>}
        </div>
      </div>
    </div>
  )
}

function CopyVal({ val, label, gold, small, large }) {
  const [copied, setCopied] = useState(false)
  const copy = (e) => { e.stopPropagation(); navigator.clipboard.writeText(val); setCopied(true); setTimeout(()=>setCopied(false),1500) }
  const size = large ? '16px' : small ? '11px' : '13px'
  return (
    <button onClick={copy} style={{background:copied?'rgba(77,207,170,0.1)':gold?'rgba(196,169,106,0.08)':'rgba(255,255,255,0.05)',border:copied?'0.5px solid rgba(77,207,170,0.4)':gold?'0.5px solid rgba(196,169,106,0.25)':'0.5px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:large?'6px 12px':small?'2px 8px':'4px 12px',fontSize:size,fontWeight:large||gold?600:400,color:copied?'#4dcfaa':gold?'#C4A96A':'rgba(255,255,255,0.7)',cursor:'pointer',fontFamily:'monospace',transition:'all 0.2s',display:'flex',alignItems:'center',gap:'4px',width:'100%',justifyContent:'center',boxShadow:large&&!copied?gold?'0 0 10px rgba(196,169,106,0.1)':'0 0 10px rgba(255,255,255,0.03)':'none'}}>
      {copied?'✓ copiado':val} {!copied&&<span style={{fontSize:'9px',opacity:0.4}}>⎘</span>}
    </button>
  )
}

function AnigracoRef() {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(REF_ANIGRACO); setCopied(true); setTimeout(()=>setCopied(false),1500) }
  return (
    <button onClick={copy} style={{display:'flex',flexDirection:'column',alignItems:'flex-start',background:'rgba(255,255,255,0.03)',border:copied?'0.5px solid rgba(196,169,106,0.5)':'0.5px solid rgba(196,169,106,0.2)',borderLeft:copied?'2px solid #C4A96A':'2px solid rgba(196,169,106,0.4)',borderRadius:'8px',padding:'4px 12px',cursor:'pointer',transition:'all 0.2s'}}>
      <span style={{fontSize:'9px',letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(196,169,106,0.6)',marginBottom:'1px'}}>Ref Anigraco {copied?'✓':'⎘'}</span>
      <span style={{fontSize:'14px',fontWeight:700,color:copied?'#C4A96A':'rgba(255,255,255,0.8)',fontFamily:'monospace'}}>{REF_ANIGRACO}</span>
    </button>
  )
}

function MaterialModal({ tipoProjeto, onSelect, onClose }) {
  const [tipo, setTipo] = useState(TIPOS_PEDRA.includes(tipoProjeto)?tipoProjeto:'SILESTONES')
  const [grupo, setGrupo] = useState('TODOS')
  const [search, setSearch] = useState('')
  const mat = ANIGRACO[tipo]
  const grupos = ['TODOS',...new Set(mat.materiais.map(m=>m.grupo||'SEM GRUPO'))]
  const lista = mat.materiais.filter(m=>{
    const mg = grupo==='TODOS'||(m.grupo||'SEM GRUPO')===grupo
    const ms = !search||m.desc.toLowerCase().includes(search.toLowerCase())
    return mg&&ms
  })
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
      <div style={{background:'#161618',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'16px',padding:'1.5rem',width:'520px',maxWidth:'90vw',maxHeight:'80vh',display:'flex',flexDirection:'column',gap:'10px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>Selecionar material</span>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'18px',cursor:'pointer'}}>✕</button>
        </div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          {TIPOS_PEDRA.map(t=>(
            <button key={t} onClick={()=>{setTipo(t);setGrupo('TODOS');setSearch('')}} style={{height:'26px',padding:'0 0.75rem',borderRadius:'20px',border:tipo===t?'0.5px solid rgba(196,169,106,0.4)':'0.5px solid rgba(255,255,255,0.08)',background:tipo===t?'rgba(196,169,106,0.1)':'rgba(255,255,255,0.03)',fontSize:'11px',color:tipo===t?'#C4A96A':'rgba(255,255,255,0.4)',cursor:'pointer'}}>
              {t.charAt(0)+t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {grupos.length>2 && (
          <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
            {grupos.map(g=>(
              <button key={g} onClick={()=>setGrupo(g)} style={{height:'24px',padding:'0 0.6rem',borderRadius:'20px',border:grupo===g?'0.5px solid rgba(196,169,106,0.3)':'0.5px solid rgba(255,255,255,0.06)',background:grupo===g?'rgba(196,169,106,0.08)':'transparent',fontSize:'10px',color:grupo===g?'#C4A96A':'rgba(255,255,255,0.35)',cursor:'pointer'}}>
                {g}
              </button>
            ))}
          </div>
        )}
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
          {lista.length===0&&<div style={{padding:'2rem',textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:'12px'}}>Sem resultados</div>}
        </div>
      </div>
    </div>
  )
}

function FormulaPanel({ margem, setMargem, c1Auto }) {
  const [modo, setModo] = useState('auto')
  const [c1Manual, setC1Manual] = useState('')
  const c1Val = modo==='auto' ? c1Auto/100 : (parseFloat(c1Manual)||0)
  const pvpCalc = c1Val>0 && margem<100 ? (c1Val/(1-margem/100))*1.23 : 0
  return (
    <div style={{background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'1rem',marginTop:'8px'}}>
      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginBottom:'10px',fontFamily:'monospace'}}>PVP = (C1 ÷ (1 − margem)) × 1.23</div>
      <div style={{display:'flex',gap:'6px',marginBottom:'10px'}}>
        {['auto','manual'].map(m=>(
          <button key={m} onClick={()=>setModo(m)} style={{height:'26px',padding:'0 0.75rem',borderRadius:'20px',border:modo===m?'0.5px solid rgba(196,169,106,0.4)':'0.5px solid rgba(255,255,255,0.08)',background:modo===m?'rgba(196,169,106,0.1)':'rgba(255,255,255,0.03)',fontSize:'11px',color:modo===m?'#C4A96A':'rgba(255,255,255,0.4)',cursor:'pointer'}}>
            {m==='auto'?'C1 do cálculo':'C1 manual'}
          </button>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:'12px',alignItems:'center'}}>
        <div>
          <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'4px'}}>C1 (€)</div>
          {modo==='manual'
            ? <input type="number" value={c1Manual} onChange={e=>setC1Manual(e.target.value)} placeholder="0.00" style={{...INPUT_NUM}}/>
            : <div style={{fontSize:'16px',fontWeight:600,color:'rgba(255,255,255,0.7)',textAlign:'right',minWidth:'80px'}}>{c1Val>0?f2(c1Val):'—'}</div>
          }
        </div>
        <div>
          <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'4px'}}>Margem %</div>
          <input type="number" value={margem} onChange={e=>setMargem(parseFloat(e.target.value)||0)} min={0} max={99} style={INPUT}/>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'4px'}}>PVP</div>
          {pvpCalc>0
            ? <CopyVal val={f2(pvpCalc)} label="PVP" gold />
            : <div style={{fontSize:'16px',color:'rgba(255,255,255,0.2)'}}>—</div>
          }
        </div>
      </div>
    </div>
  )
}
