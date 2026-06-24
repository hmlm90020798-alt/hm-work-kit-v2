import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase/config'
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

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
    t + (s.itens||[]).reduce((st, i) =>
      st + ((i.preco||0) * (i.qty||1)), 0), 0)
}

export default function Orcamento() {
  const [orcamentos, setOrcamentos] = useState([])
  const [orcAtivo, setOrcAtivo]     = useState(null)
  const [novoModal, setNovoModal]   = useState(false)
  const [form, setForm] = useState({ nome:'', contacto:'', pc:'', estado:'curso' })

  useEffect(() => {
    const u = onSnapshot(collection(db,'orcamentos'), snap => {
      const docs = snap.docs.map(d=>({id:d.id,...d.data()}))
      docs.sort((a,b)=>(b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0))
      setOrcamentos(docs)
    })
    return u
  }, [])

  const criarOrcamento = async () => {
    const ref = await addDoc(collection(db,'orcamentos'), {
      ...form, secoes:[], estado:'curso',
      createdAt:serverTimestamp(), updatedAt:serverTimestamp(),
    })
    setNovoModal(false)
    setForm({ nome:'', contacto:'', pc:'', estado:'curso' })
    setOrcAtivo({ id:ref.id, ...form, secoes:[], estado:'curso' })
  }

  const delOrcamento = async (id, nome) => {
    if (!confirm(`Eliminar "${nome||'sem nome'}"?`)) return
    await deleteDoc(doc(db,'orcamentos',id))
    if (orcAtivo?.id===id) setOrcAtivo(null)
  }

  const updateOrcamento = async (id, data) => {
    await updateDoc(doc(db,'orcamentos',id), {...data, updatedAt:serverTimestamp()})
  }

  if (orcAtivo) return (
    <OrcamentoDetalhe
      orc={orcamentos.find(o=>o.id===orcAtivo.id) || orcAtivo}
      onVoltar={()=>setOrcAtivo(null)}
      onUpdate={(data)=>updateOrcamento(orcAtivo.id, data)}
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
                <div key={orc.id} onClick={()=>setOrcAtivo(orc)}
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

function OrcamentoDetalhe({ orc, onVoltar, onUpdate }) {
  const navigate = useNavigate()
  const [secoes, setSecoes]     = useState(orc.secoes||[])
  const [novaSecao, setNovaSecao] = useState('')

  // Receber artigo vindo da Biblioteca — corre ao montar e em focus
  const processarPendente = () => {
    const raw = localStorage.getItem('orc_pendente_artigo')
    if (!raw) return
    try {
      const { secaoId, artigo } = JSON.parse(raw)
      localStorage.removeItem('orc_pendente_artigo')
      setSecoes(prev => {
        const novas = prev.map(s => {
          if (s.id !== secaoId) return s
          const idx = (s.itens||[]).findIndex(i => i.ref === artigo.ref)
          if (idx >= 0) {
            const itens = [...s.itens]
            itens[idx] = { ...itens[idx], qty: (itens[idx].qty||1)+1 }
            return { ...s, itens }
          }
          return { ...s, itens: [...(s.itens||[]), { ...artigo, qty:1 }] }
        })
        onUpdate({ secoes: novas })
        return novas
      })
    } catch(e) { localStorage.removeItem('orc_pendente_artigo') }
  }

  useEffect(() => {
    processarPendente()
    window.addEventListener('focus', processarPendente)
    return () => window.removeEventListener('focus', processarPendente)
  }, [])

  // Sincronizar secoes quando orc muda externamente
  useEffect(() => { setSecoes(orc.secoes||[]) }, [orc.id])

  const total = calcTotal(secoes)

  const addSecao = () => {
    if (!novaSecao.trim()) return
    const nova = { id: Date.now().toString(), nome: novaSecao.trim(), itens:[] }
    const novas = [...secoes, nova]
    setSecoes(novas)
    onUpdate({ secoes: novas })
    setNovaSecao('')
  }

  const delSecao = (id) => {
    const novas = secoes.filter(s=>s.id!==id)
    setSecoes(novas)
    onUpdate({ secoes: novas })
  }

  const delItem = (secaoId, idx) => {
    const novas = secoes.map(s => {
      if (s.id!==secaoId) return s
      const itens = s.itens.filter((_,i)=>i!==idx)
      return { ...s, itens }
    })
    setSecoes(novas)
    onUpdate({ secoes: novas })
  }

  const updateQty = (secaoId, idx, qty) => {
    if (qty<1) return
    const novas = secoes.map(s => {
      if (s.id!==secaoId) return s
      const itens = [...s.itens]
      itens[idx] = { ...itens[idx], qty }
      return { ...s, itens }
    })
    setSecoes(novas)
    onUpdate({ secoes: novas })
  }

  const irBiblioteca = (secao) => {
    localStorage.setItem('orc_contexto', JSON.stringify({
      orcId: orc.id, secaoId: secao.id, secaoNome: secao.nome
    }))
    navigate('/biblioteca')
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
        <button style={BTN_GOLD()}>↗ Proposta</button>
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
            {secoes.map(secao => (
              <div key={secao.id} style={{background:'rgba(255,255,255,0.025)',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'10px',overflow:'hidden'}}>

                {/* Cabeçalho secção */}
                <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0.6rem 1rem',borderBottom:'0.5px solid rgba(255,255,255,0.05)'}}>
                  <span style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.6)',flex:1}}>{secao.nome}</span>
                  <span style={{fontSize:'11px',color:'rgba(255,255,255,0.25)'}}>{(secao.itens||[]).length} itens</span>
                  <span style={{fontSize:'12px',fontWeight:500,color:'#C4A96A',marginLeft:'8px'}}>
                    {(secao.itens||[]).reduce((t,i)=>t+(i.preco||0)*(i.qty||1),0).toFixed(2)} €
                  </span>
                  <button onClick={()=>delSecao(secao.id)} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.3)',fontSize:'13px',padding:'2px 6px'}}>✕</button>
                </div>

                {/* Botão adicionar artigo */}
                <div style={{padding:'8px 1rem',borderBottom:'0.5px solid rgba(255,255,255,0.04)'}}>
                  <button
                    onClick={()=>irBiblioteca(secao)}
                    style={{height:'28px',padding:'0 0.875rem',borderRadius:'6px',border:'0.5px solid rgba(196,169,106,0.3)',background:'rgba(196,169,106,0.06)',fontSize:'11.5px',color:'rgba(196,169,106,0.8)',cursor:'pointer'}}
                  >
                    + Artigo da Biblioteca
                  </button>
                </div>

                {/* Lista de itens */}
                {(secao.itens||[]).length===0 ? (
                  <div style={{padding:'0.75rem 1rem',fontSize:'12px',color:'rgba(255,255,255,0.2)'}}>
                    Nenhum artigo ainda.
                  </div>
                ) : (
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 32px',padding:'0.4rem 1rem',borderBottom:'0.5px solid rgba(255,255,255,0.04)'}}>
                      {['Artigo','Qty','Total',''].map(h=>(
                        <span key={h} style={{fontSize:'10px',color:'rgba(255,255,255,0.2)',letterSpacing:'0.06em',textTransform:'uppercase',textAlign:h==='Total'?'right':h===''?'center':'left'}}>{h}</span>
                      ))}
                    </div>
                    {(secao.itens||[]).map((item,idx)=>(
                      <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 32px',alignItems:'center',padding:'0.5rem 1rem',borderBottom:'0.5px solid rgba(255,255,255,0.03)'}}>
                        <div>
                          <div style={{fontSize:'12px',color:'rgba(255,255,255,0.75)'}}>{item.desc}</div>
                          {item.ref&&<div style={{fontSize:'10px',color:'rgba(196,169,106,0.5)',fontFamily:'monospace'}}>{item.ref}</div>}
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                          <button onClick={()=>updateQty(secao.id,idx,(item.qty||1)-1)} style={{width:'20px',height:'20px',borderRadius:'4px',border:'0.5px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                          <span style={{fontSize:'12px',color:'rgba(255,255,255,0.6)',minWidth:'20px',textAlign:'center'}}>{item.qty||1}</span>
                          <button onClick={()=>updateQty(secao.id,idx,(item.qty||1)+1)} style={{width:'20px',height:'20px',borderRadius:'4px',border:'0.5px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                        </div>
                        <span style={{fontSize:'12px',fontWeight:500,color:'#C4A96A',textAlign:'right'}}>{((item.preco||0)*(item.qty||1)).toFixed(2)} €</span>
                        <button onClick={()=>delItem(secao.id,idx)} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.35)',fontSize:'13px',textAlign:'center'}}>✕</button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{display:'flex',gap:'8px',marginTop:'0.5rem'}}>
          <input value={novaSecao} onChange={e=>setNovaSecao(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSecao()} placeholder="Nova secção (ex: Cozinha)..." style={{...INPUT,flex:1}}/>
          <button onClick={addSecao} style={BTN_GOLD()}>+ Secção</button>
        </div>
      </div>
    </div>
  )
}
