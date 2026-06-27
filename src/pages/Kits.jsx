import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase/config'
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import CopyRef from '../components/CopyRef'

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

export default function Kits() {
  const navigate = useNavigate()
  const [kits, setKits] = useState([])
  const [kitAtivo, setKitAtivo] = useState(() => { try { return JSON.parse(localStorage.getItem('kit_ativo')) } catch { return null } })
  const [novoModal, setNovoModal] = useState(false)
  const [nomeNovo, setNomeNovo] = useState('')

  useEffect(() => {
    const u = onSnapshot(collection(db,'kits'), snap => {
      const docs = snap.docs.map(d=>({id:d.id,...d.data()}))
      docs.sort((a,b)=>(a.nome||'').localeCompare(b.nome||''))
      setKits(docs)
    })
    return u
  }, [])

  const setKit = (kit) => {
    setKitAtivo(kit)
    if (kit) localStorage.setItem('kit_ativo', JSON.stringify(kit))
    else localStorage.removeItem('kit_ativo')
  }

  const criarKit = async () => {
    if (!nomeNovo.trim()) return
    const ref = await addDoc(collection(db,'kits'), {
      nome: nomeNovo.trim(), itens: [], createdAt: serverTimestamp()
    })
    setNovoModal(false)
    setNomeNovo('')
    setKit({ id: ref.id, nome: nomeNovo.trim(), itens: [] })
  }

  const delKit = async (id, nome) => {
    if (!confirm(`Eliminar kit "${nome}"?`)) return
    await deleteDoc(doc(db,'kits',id))
    if (kitAtivo?.id===id) setKit(null)
  }

  if (kitAtivo) return (
    <KitDetalhe
      kit={kits.find(k=>k.id===kitAtivo.id) || kitAtivo}
      onVoltar={()=>setKit(null)}
    />
  )

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)'}}>
        <div style={{flex:1,fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.7)'}}>Kits</div>
        <button onClick={()=>setNovoModal(true)} style={BTN_GOLD()}>+ Novo kit</button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>
        {kits.length===0 ? (
          <div style={{textAlign:'center',padding:'4rem 0',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>
            <div style={{fontSize:'32px',marginBottom:'1rem'}}>🗂️</div>
            Nenhum kit ainda. Cria o primeiro.
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'10px'}}>
            {kits.map(kit=>(
              <div key={kit.id} onClick={()=>setKit(kit)}
                style={{background:'rgba(255,255,255,0.03)',backdropFilter:'blur(12px)',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1.25rem',cursor:'pointer',transition:'all 0.15s',position:'relative',overflow:'hidden'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.borderColor='rgba(196,169,106,0.25)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.03)';e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}}
              >
                <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)'}}/>
                <div style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)',marginBottom:'6px'}}>{kit.nome}</div>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',marginBottom:'0.875rem'}}>{(kit.itens||[]).length} itens</div>
                <div style={{display:'flex',flexDirection:'column',gap:'3px',maxHeight:'80px',overflow:'hidden'}}>
                  {(kit.itens||[]).slice(0,3).map((item,i)=>(
                    <div key={i} style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',display:'flex',gap:'6px',alignItems:'center'}}>
                      <span style={{color:'rgba(196,169,106,0.5)',fontFamily:'monospace',fontSize:'10px'}}>{item.ref||'—'}</span>
                      <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.desc}</span>
                    </div>
                  ))}
                  {(kit.itens||[]).length>3 && <div style={{fontSize:'10px',color:'rgba(255,255,255,0.2)'}}>+{(kit.itens||[]).length-3} mais...</div>}
                </div>
                <button onClick={e=>{e.stopPropagation();delKit(kit.id,kit.nome)}} style={{position:'absolute',top:'10px',right:'10px',background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.3)',fontSize:'14px',padding:'4px'}}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {novoModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
          <div style={{background:'#161618',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'16px',padding:'1.5rem',width:'400px',maxWidth:'90vw'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
              <span style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>Novo kit</span>
              <button onClick={()=>setNovoModal(false)} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'18px',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>Nome do kit</div>
            <input value={nomeNovo} onChange={e=>setNomeNovo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&criarKit()} placeholder="ex: Cozinha completa" style={INPUT} autoFocus/>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'8px',marginTop:'1.25rem'}}>
              <button onClick={()=>setNovoModal(false)} style={BTN()}>Cancelar</button>
              <button onClick={criarKit} style={BTN_GOLD()}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KitDetalhe({ kit, onVoltar }) {
  const navigate = useNavigate()
  const [novoItem, setNovoItem] = useState({ ref:'', desc:'', preco:'', tipo:'artigo' })
  const [editIdx, setEditIdx] = useState(null)
  const [aplicarModal, setAplicarModal] = useState(false)

  const saveItens = async (itens) => {
    await updateDoc(doc(db,'kits',kit.id), { itens })
  }

  const irBiblioteca = () => {
    localStorage.setItem('kit_contexto', JSON.stringify({ kitId: kit.id, kitNome: kit.nome }))
    navigate('/biblioteca')
  }

  const addItem = async () => {
    if (!novoItem.desc.trim()) return
    const item = { ref: novoItem.ref, desc: novoItem.desc, preco: parseFloat(novoItem.preco)||0, tipo: novoItem.tipo }
    await saveItens([...(kit.itens||[]), item])
    setNovoItem({ ref:'', desc:'', preco:'', tipo:'artigo' })
  }

  const delItem = async (idx) => {
    await saveItens((kit.itens||[]).filter((_,i)=>i!==idx))
  }

  const totalKit = (kit.itens||[]).reduce((t,i)=>t+(i.preco||0),0)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)'}}>
        <button onClick={onVoltar} style={BTN()}>← Kits</button>
        <div style={{flex:1,fontSize:'13px',fontWeight:500,color:'rgba(255,255,255,0.8)'}}>{kit.nome}</div>
        <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{(kit.itens||[]).length} itens</span>
        {totalKit>0 && <span style={{fontSize:'14px',fontWeight:500,color:'#C4A96A'}}>{totalKit.toFixed(2)} €</span>}
        <button onClick={()=>setAplicarModal(true)} style={BTN_GOLD()}>↗ Aplicar ao orçamento</button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>

        {/* Lista de itens */}
        {(kit.itens||[]).length===0 ? (
          <div style={{textAlign:'center',padding:'2rem 0',color:'rgba(255,255,255,0.2)',fontSize:'13px',marginBottom:'1.5rem'}}>
            Nenhum item ainda. Adiciona abaixo.
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'4px',marginBottom:'1.5rem'}}>
            {(kit.itens||[]).map((item,idx)=>(
              <div key={idx} style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto',alignItems:'center',gap:'10px',padding:'0.625rem 1rem',background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'8px'}}>
                <span style={{fontSize:'10px',padding:'2px 6px',borderRadius:'4px',background:item.tipo==='mao-de-obra'?'rgba(80,140,230,0.1)':'rgba(196,169,106,0.08)',color:item.tipo==='mao-de-obra'?'#7aaff0':'rgba(196,169,106,0.7)',whiteSpace:'nowrap'}}>
                  {item.tipo==='mao-de-obra'?'M.O.':'Artigo'}
                </span>
                <div>
                  <div style={{fontSize:'12.5px',color:'rgba(255,255,255,0.78)',marginBottom:'2px'}}>{item.desc}</div>
                  {item.ref && <CopyRef refCode={item.ref} />}
                </div>
                {item.preco>0 && <span style={{fontSize:'12px',fontWeight:500,color:'#C4A96A',whiteSpace:'nowrap'}}>{item.preco.toFixed(2)} €</span>}
                <button onClick={()=>delItem(idx)} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.35)',fontSize:'13px',padding:'4px'}}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Adicionar item */}
        <div style={{background:'rgba(255,255,255,0.025)',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'1rem'}}>
          <div style={{fontSize:'10px',color:'rgba(255,255,255,0.25)',marginBottom:'0.875rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>Adicionar item</div>

          <div style={{display:'flex',gap:'6px',marginBottom:'10px',alignItems:'center'}}>
            {[['artigo','Artigo'],['mao-de-obra','Mão de obra']].map(([v,l])=>(
              <button key={v} onClick={()=>setNovoItem(n=>({...n,tipo:v}))} style={{height:'28px',padding:'0 0.75rem',borderRadius:'20px',border:novoItem.tipo===v?'0.5px solid rgba(196,169,106,0.4)':'0.5px solid rgba(255,255,255,0.08)',background:novoItem.tipo===v?'rgba(196,169,106,0.1)':'rgba(255,255,255,0.03)',fontSize:'11px',color:novoItem.tipo===v?'#C4A96A':'rgba(255,255,255,0.4)',cursor:'pointer'}}>
                {l}
              </button>
            ))}
            {novoItem.tipo==='artigo' && (
              <button onClick={irBiblioteca} style={{...BTN(),height:'28px',fontSize:'11px',marginLeft:'auto'}}>
                🔍 Pesquisar na Biblioteca
              </button>
            )}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'120px 1fr 100px',gap:'8px',marginBottom:'8px'}}>
            <input value={novoItem.ref} onChange={e=>setNovoItem(n=>({...n,ref:e.target.value}))} placeholder={novoItem.tipo==='artigo'?'Ref LM':'—'} style={INPUT} disabled={novoItem.tipo==='mao-de-obra'}/>
            <input value={novoItem.desc} onChange={e=>setNovoItem(n=>({...n,desc:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addItem()} placeholder="Descrição" style={INPUT}/>
            <input type="number" value={novoItem.preco} onChange={e=>setNovoItem(n=>({...n,preco:e.target.value}))} placeholder="Preço €" style={INPUT}/>
          </div>
          <button onClick={addItem} style={BTN_GOLD()}>+ Adicionar</button>
        </div>
      </div>

      {/* Modal aplicar ao orçamento */}
      {aplicarModal && (
        <AplicarModal kit={kit} onClose={()=>setAplicarModal(false)} onDone={()=>{setAplicarModal(false);navigate('/orcamento')}}/>
      )}
    </div>
  )
}

function AplicarModal({ kit, onClose, onDone }) {
  const [orcamentos, setOrcamentos] = useState([])
  const [orcId, setOrcId] = useState('')
  const [secaoNome, setSecaoNome] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const u = onSnapshot(collection(db,'orcamentos'), snap => {
      setOrcamentos(snap.docs.map(d=>({id:d.id,...d.data()})))
    })
    return u
  }, [])

  const aplicar = async () => {
    if (!orcId || !secaoNome.trim()) return
    setLoading(true)
    try {
      const orcRef = doc(db,'orcamentos',orcId)
      const snap = await getDoc(orcRef)
      if (!snap.exists()) return
      const secoes = snap.data().secoes || []
      const secaoExiste = secoes.find(s=>s.nome===secaoNome.trim())
      const secaoId = secaoExiste?.id || Date.now().toString()
      const itensKit = (kit.itens||[]).map(i=>({
        ref: i.ref||'', desc: i.desc, preco: i.preco||0,
        supplier: '', cat: '', sub: '', qty: 1
      }))
      let novaSecoes
      if (secaoExiste) {
        novaSecoes = secoes.map(s=>s.id===secaoId?{...s,itens:[...(s.itens||[]),...itensKit]}:s)
      } else {
        novaSecoes = [...secoes, { id:secaoId, nome:secaoNome.trim(), itens:itensKit }]
      }
      await updateDoc(orcRef, { secoes: novaSecoes, updatedAt: serverTimestamp() })
      localStorage.setItem('orc_ativo_id', orcId)
      onDone()
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
      <div style={{background:'#161618',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'16px',padding:'1.5rem',width:'420px',maxWidth:'90vw'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
          <span style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>Aplicar kit ao orçamento</span>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'18px',cursor:'pointer'}}>✕</button>
        </div>
        <div style={{display:'grid',gap:'10px'}}>
          <div>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>Orçamento</div>
            <select value={orcId} onChange={e=>setOrcId(e.target.value)} style={{...INPUT,background:'#1a1a1c',cursor:'pointer'}}>
              <option value=''>Selecionar orçamento</option>
              {orcamentos.map(o=><option key={o.id} value={o.id}>{o.nome||'Sem nome'}{o.pc?' — PC '+o.pc:''}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>Secção (nova ou existente)</div>
            <input value={secaoNome} onChange={e=>setSecaoNome(e.target.value)} placeholder="ex: Cozinha" style={INPUT}/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:'8px',marginTop:'1.25rem'}}>
          <button onClick={onClose} style={BTN()}>Cancelar</button>
          <button onClick={aplicar} disabled={!orcId||!secaoNome.trim()||loading} style={BTN_GOLD({opacity:(!orcId||!secaoNome.trim())?0.5:1})}>
            {loading?'A aplicar...':'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
