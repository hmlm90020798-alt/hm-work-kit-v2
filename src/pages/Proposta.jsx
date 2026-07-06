import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, doc, onSnapshot, getDoc } from 'firebase/firestore'

const BTN = (extra={}) => ({
  height:'34px', padding:'0 1rem', borderRadius:'8px',
  border:'0.5px solid rgba(255,255,255,0.1)',
  background:'rgba(255,255,255,0.04)',
  fontSize:'12px', color:'rgba(255,255,255,0.55)',
  cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', ...extra
})
const BTN_GOLD = (extra={}) => BTN({
  background:'rgba(196,169,106,0.12)',
  border:'0.5px solid rgba(196,169,106,0.35)',
  color:'#C4A96A', ...extra
})

function formatData(d) {
  return new Date().toLocaleDateString('pt-PT', { day:'2-digit', month:'long', year:'numeric' })
}

function calcSubtotalSecao(secao) {
  return (secao.itens||[]).reduce((t,i)=>{
    const ativa = i.variantes ? (i.variantes.find(v=>v.ativa)||i.variantes[0]) : i
    return t + (ativa.preco||i.preco||0)*(i.qty||1)
  },0)
}
function calcTotal(secoes) {
  return (secoes||[]).reduce((t,s)=>t+calcSubtotalSecao(s),0)
}

export default function Proposta() {
  const [orcamentos, setOrcamentos] = useState([])
  const [orcId, setOrcId] = useState(() => localStorage.getItem('proposta_orc_id') || null)

  useEffect(() => {
    const u = onSnapshot(collection(db,'orcamentos'), snap => {
      const docs = snap.docs.map(d=>({id:d.id,...d.data()}))
      docs.sort((a,b)=>(b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0))
      setOrcamentos(docs)
    })
    return u
  }, [])

  const abrirProposta = (id) => {
    localStorage.setItem('proposta_orc_id', id)
    setOrcId(id)
  }
  const voltarLista = () => {
    localStorage.removeItem('proposta_orc_id')
    setOrcId(null)
  }

  const orc = orcamentos.find(o=>o.id===orcId)

  if (orcId && orc) return <PropostaView orc={orc} onVoltar={voltarLista} />
  if (orcId && !orc) return (
    <div style={{padding:'2rem',color:'rgba(255,255,255,0.3)',fontSize:'13px'}}>A carregar orçamento...</div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)'}}>
        <div style={{flex:1,fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.7)'}}>Proposta</div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>
        <div style={{fontSize:'10px',letterSpacing:'0.07em',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:'0.875rem'}}>
          Seleciona um orçamento para gerar a proposta
        </div>
        {orcamentos.length===0 ? (
          <div style={{textAlign:'center',padding:'3rem 0',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>Nenhum orçamento criado ainda.</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {orcamentos.map(o=>{
              const total = calcTotal(o.secoes)
              return (
                <div key={o.id} onClick={()=>abrirProposta(o.id)}
                  style={{background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem 1.25rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'1rem',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                >
                  <div style={{flex:1}}>
                    <div style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>{o.nome||'Sem nome'}</div>
                    <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{o.pc?'PC '+o.pc:''}{(o.secoes||[]).length} secções</div>
                  </div>
                  <span style={{fontSize:'15px',fontWeight:500,color:'#C4A96A'}}>{total.toFixed(2)} €</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PropostaView({ orc, onVoltar }) {
  const total = calcTotal(orc.secoes)

  return (
    <div style={{minHeight:'100vh',background:'#0d0d0f'}}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
          .proposta-doc {
            background: #fff !important;
            margin: 0 !important;
            max-width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .proposta-doc, .proposta-doc * { color: #2a2a2a !important; }
          .proposta-doc .proposta-secao-nome,
          .proposta-doc .proposta-total-val { color: #8a6f2f !important; }
          .proposta-doc [style*="border-bottom"],
          .proposta-doc [style*="border-top"] { border-color: #c9b47a !important; }
        }
      `}</style>

      {/* Barra de ações — não imprime */}
      <div className="no-print" style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',position:'sticky',top:0,background:'rgba(13,13,15,0.95)',zIndex:10}}>
        <button onClick={onVoltar} style={BTN()}>← Proposta</button>
        <div style={{flex:1}}/>
        <button onClick={()=>window.print()} style={BTN_GOLD()}>🖨 Imprimir / Guardar PDF</button>
      </div>

      {/* Documento */}
      <div className="proposta-doc" style={{
        maxWidth:'760px', margin:'2rem auto', background:'#161618',
        border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:'12px',
        padding:'2.5rem 3rem', color:'rgba(255,255,255,0.85)',
      }}>
        {/* Cabeçalho */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'2rem',paddingBottom:'1.5rem',borderBottom:'2px solid #C4A96A'}}>
          <div>
            <div style={{fontSize:'11px',letterSpacing:'0.15em',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',marginBottom:'6px'}}>Proposta de Orçamento</div>
            <div style={{fontSize:'20px',fontWeight:600,color:'#C4A96A'}}>{orc.nome||'Cliente'}</div>
          </div>
          <div style={{textAlign:'right',fontSize:'12px',color:'rgba(255,255,255,0.4)'}}>
            {orc.pc && <div>PC {orc.pc}</div>}
            {orc.contacto && <div>{orc.contacto}</div>}
            <div>{formatData()}</div>
          </div>
        </div>

        {/* Secções */}
        {(orc.secoes||[]).map(secao=>{
          const subtotal = calcSubtotalSecao(secao)
          return (
            <div key={secao.id} style={{marginBottom:'1.75rem'}}>
              <div className="proposta-secao-nome" style={{fontSize:'14px',fontWeight:600,color:'#C4A96A',marginBottom:'0.75rem',paddingBottom:'0.4rem',borderBottom:'0.5px solid rgba(196,169,106,0.25)'}}>
                {secao.nome}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px',marginBottom:'0.75rem'}}>
                {(secao.itens||[]).map((item,idx)=>{
                  const ativa = item.variantes ? (item.variantes.find(v=>v.ativa)||item.variantes[0]) : item
                  return (
                    <div key={idx} style={{fontSize:'13px',color:'rgba(255,255,255,0.7)',paddingLeft:'0.5rem'}}>
                      • {ativa.desc||item.desc}{(item.qty||1)>1 ? ` (${item.qty}x)` : ''}
                    </div>
                  )
                })}
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',fontSize:'13px',fontWeight:500,color:'rgba(255,255,255,0.55)'}}>
                Subtotal: {subtotal.toFixed(2)} €
              </div>
            </div>
          )
        })}

        {/* Total */}
        <div style={{marginTop:'2rem',paddingTop:'1.25rem',borderTop:'2px solid #C4A96A',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:'14px',color:'rgba(255,255,255,0.6)'}}>Total da Proposta</span>
          <span className="proposta-total-val" style={{fontSize:'26px',fontWeight:700,color:'#C4A96A'}}>{total.toFixed(2)} €</span>
        </div>

        <div style={{marginTop:'2rem',fontSize:'10px',color:'rgba(255,255,255,0.25)',textAlign:'center'}}>
          Proposta válida por 30 dias. Preços incluem IVA à taxa em vigor.
        </div>
      </div>
    </div>
  )
}
