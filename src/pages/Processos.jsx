import { useState, useEffect } from 'react'
import { db } from '../firebase/config'
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { corPorNome } from '../utils/corPorNome'

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

export default function Processos() {
  const [processos, setProcessos] = useState([])
  const [ativo, setAtivo] = useState(null)
  const [novoModal, setNovoModal] = useState(false)
  const [search, setSearch] = useState('')
  const [catFiltro, setCatFiltro] = useState('Todas')

  useEffect(() => {
    const u = onSnapshot(collection(db,'processos'), snap => {
      const docs = snap.docs.map(d=>({id:d.id,...d.data()}))
      docs.sort((a,b)=>(a.nome||'').localeCompare(b.nome||''))
      setProcessos(docs)
    })
    return u
  }, [])

  const categorias = ['Todas', ...new Set(processos.map(p=>p.categoria).filter(Boolean))].sort()

  const filtrados = processos.filter(p => {
    const catOk = catFiltro==='Todas' || p.categoria===catFiltro
    const q = search.toLowerCase()
    const searchOk = !q || p.nome?.toLowerCase().includes(q) ||
      (p.itens||[]).some(i=>i.texto?.toLowerCase().includes(q))
    return catOk && searchOk
  })

  const criar = async (nome, categoria) => {
    if (!nome.trim()) return
    const ref = await addDoc(collection(db,'processos'), {
      nome: nome.trim(), categoria: categoria.trim()||'Geral', itens: [], updatedAt: serverTimestamp()
    })
    setNovoModal(false)
    setAtivo({ id: ref.id, nome: nome.trim(), categoria: categoria.trim()||'Geral', itens: [] })
  }

  const delProcesso = async (id, nome) => {
    if (!confirm(`Eliminar "${nome}"?`)) return
    await deleteDoc(doc(db,'processos',id))
    if (ativo?.id===id) setAtivo(null)
  }

  if (ativo) return (
    <ProcessoDetalhe
      processo={processos.find(p=>p.id===ativo.id) || ativo}
      onVoltar={()=>setAtivo(null)}
    />
  )

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)'}}>
        <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'0 0.75rem',height:'34px'}}>
          <span style={{color:'rgba(255,255,255,0.25)'}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar processos..." style={{border:'none',background:'transparent',outline:'none',fontSize:'12px',color:'rgba(255,255,255,0.7)',width:'100%'}}/>
        </div>
        <button onClick={()=>setNovoModal(true)} style={BTN_GOLD()}>+ Processo</button>
      </div>

      {categorias.length>1 && (
        <div style={{display:'flex',gap:'6px',padding:'8px 1.25rem',overflowX:'auto',flexShrink:0,borderBottom:'0.5px solid rgba(255,255,255,0.05)'}}>
          {categorias.map(c=>(
            <button key={c} onClick={()=>setCatFiltro(c)} style={{...BTN(catFiltro===c?{background:'rgba(196,169,106,0.1)',borderColor:'rgba(196,169,106,0.3)',color:'#C4A96A'}:{}),height:'26px',fontSize:'11px',borderRadius:'20px'}}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>
        {filtrados.length===0 ? (
          <div style={{textAlign:'center',padding:'3rem 0',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>
            {processos.length===0 ? 'Nenhum processo ainda. Cria o primeiro.' : 'Nenhum processo encontrado.'}
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'10px'}}>
            {filtrados.map(p=>{
              const cor = corPorNome(p.categoria)
              return (
                <div key={p.id} onClick={()=>setAtivo(p)}
                  style={{background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.07)',borderLeft:`2px solid ${cor.color}`,borderRadius:'12px',padding:'1.1rem',cursor:'pointer',position:'relative',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                >
                  <button tabIndex={-1} onClick={e=>{e.stopPropagation();delProcesso(p.id,p.nome)}} style={{position:'absolute',top:'10px',right:'10px',background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.3)',fontSize:'13px'}}>✕</button>
                  <span style={{fontSize:'9px',padding:'2px 8px',borderRadius:'20px',background:cor.bg,color:cor.color}}>{p.categoria}</span>
                  <div style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)',margin:'8px 0 4px'}}>{p.nome}</div>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{(p.itens||[]).length} blocos</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {novoModal && <NovoProcessoModal categoriasExistentes={categorias.filter(c=>c!=='Todas')} onSave={criar} onClose={()=>setNovoModal(false)} />}
    </div>
  )
}

function NovoProcessoModal({ categoriasExistentes, onSave, onClose }) {
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState(categoriasExistentes[0]||'')
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
      <div style={{background:'#161618',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'16px',padding:'1.5rem',width:'400px',maxWidth:'90vw'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
          <span style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>Novo processo</span>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'18px',cursor:'pointer'}}>✕</button>
        </div>
        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>Nome</div>
        <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="ex: Medição de cozinha" autoFocus style={INPUT}/>
        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',margin:'10px 0 4px'}}>Categoria</div>
        <input value={categoria} onChange={e=>setCategoria(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSave(nome,categoria)} placeholder="ex: Cozinha, Administrativo..." list="cats-existentes" style={INPUT}/>
        <datalist id="cats-existentes">{categoriasExistentes.map(c=><option key={c} value={c}/>)}</datalist>
        <div style={{display:'flex',justifyContent:'flex-end',gap:'8px',marginTop:'1.25rem'}}>
          <button onClick={onClose} style={BTN()}>Cancelar</button>
          <button onClick={()=>onSave(nome,categoria)} style={BTN_GOLD()}>Criar</button>
        </div>
      </div>
    </div>
  )
}

function ProcessoDetalhe({ processo, onVoltar }) {
  const [novoTexto, setNovoTexto] = useState('')
  const [novoTipo, setNovoTipo] = useState('texto')
  const [dragIdx, setDragIdx] = useState(null)
  const [vista, setVista] = useState('lista')
  const [anexoAlvo, setAnexoAlvo] = useState('')
  const [editIdx, setEditIdx] = useState(null)
  const [editTexto, setEditTexto] = useState('')
  const [editTipo, setEditTipo] = useState('texto')
  const [editAnexo, setEditAnexo] = useState('')
  const cor = corPorNome(processo.categoria)

  // Backfill: blocos criados antes de existir 'id' ficam sem ligação possível a notas.
  useEffect(() => {
    const itens = processo.itens || []
    if (itens.length===0 || itens.every(i=>i.id)) return
    const corrigidos = itens.map(i => i.id ? i : { ...i, id: Date.now().toString(36)+Math.random().toString(36).slice(2,7) })
    updateDoc(doc(db,'processos',processo.id), { itens: corrigidos })
  }, [processo.id])

  const saveItens = async (itens) => {
    await updateDoc(doc(db,'processos',processo.id), { itens, updatedAt: serverTimestamp() })
  }

  const addBloco = async () => {
    if (!novoTexto.trim()) return
    const snap = await getDoc(doc(db,'processos',processo.id))
    const itensAtuais = snap.exists() ? (snap.data().itens||[]) : (processo.itens||[])
    const novoBloco = { id: Date.now().toString(36)+Math.random().toString(36).slice(2,7), tipo: novoTipo, texto: novoTexto.trim() }
    if (novoTipo==='texto' && anexoAlvo) novoBloco.anexadoA = anexoAlvo
    await saveItens([...itensAtuais, novoBloco])
    setNovoTexto('')
    setAnexoAlvo('')
  }
  const abrirEdicao = (idx, item) => {
    setEditIdx(idx)
    setEditTexto(item.texto)
    setEditTipo(item.tipo)
    setEditAnexo(item.anexadoA||'')
  }

  const gravarEdicao = async (idx) => {
    if (!editTexto.trim()) return
    const snap = await getDoc(doc(db,'processos',processo.id))
    const itensAtuais = snap.exists() ? [...(snap.data().itens||[])] : [...(processo.itens||[])]
    const atual = itensAtuais[idx]
    const atualizado = { ...atual, tipo: editTipo, texto: editTexto.trim() }
    if (editTipo==='texto' && editAnexo) atualizado.anexadoA = editAnexo
    else delete atualizado.anexadoA
    itensAtuais[idx] = atualizado
    await saveItens(itensAtuais)
    setEditIdx(null)
  }

  const delBloco = async (idx) => {
    const snap = await getDoc(doc(db,'processos',processo.id))
    const itensAtuais = snap.exists() ? (snap.data().itens||[]) : (processo.itens||[])
    await saveItens(itensAtuais.filter((_,i)=>i!==idx))
  }
  const reorder = async (from, to) => {
    if (from===to) return
    const snap = await getDoc(doc(db,'processos',processo.id))
    const itens = snap.exists() ? [...(snap.data().itens||[])] : [...(processo.itens||[])]
    const [moved] = itens.splice(from,1)
    itens.splice(to,0,moved)
    await saveItens(itens)
  }

  const passos = (processo.itens||[]).filter(i=>i.tipo==='passo')

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)'}}>
        <button onClick={onVoltar} style={BTN()}>← Processos</button>
        <div style={{flex:1}}>
          <span style={{fontSize:'13px',fontWeight:500,color:'rgba(255,255,255,0.8)'}}>{processo.nome}</span>
          <span style={{marginLeft:'8px',fontSize:'10px',padding:'2px 8px',borderRadius:'20px',background:cor.bg,color:cor.color}}>{processo.categoria}</span>
        </div>
        <div style={{display:'flex',gap:'4px',background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'3px'}}>
          {[['lista','Lista'],['diagrama','Diagrama']].map(([v,l])=>(
            <button key={v} onClick={()=>setVista(v)} style={{height:'26px',padding:'0 0.75rem',borderRadius:'6px',border:'none',background:vista===v?'rgba(196,169,106,0.15)':'transparent',fontSize:'11px',color:vista===v?'#C4A96A':'rgba(255,255,255,0.4)',cursor:'pointer'}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {vista==='diagrama' ? (
        <ProcessoDiagrama processo={processo} onEditarBloco={()=>setVista('lista')} />
      ) : (

      <div style={{flex:1,overflowY:'auto',padding:'1.25rem',maxWidth:'720px'}}>
        {(processo.itens||[]).length===0 ? (
          <div style={{textAlign:'center',padding:'2rem 0',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>
            Ainda sem conteúdo. Adiciona o primeiro bloco abaixo.
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'1.5rem'}}>
            {(processo.itens||[]).map((item,idx)=>{
              const numeroPasso = item.tipo==='passo' ? passos.indexOf(item)+1 : null
              return (
                <div key={idx}
                  draggable={editIdx!==idx}
                  onDragStart={()=>setDragIdx(idx)}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={()=>{if(dragIdx!==null){reorder(dragIdx,idx);setDragIdx(null)}}}
                  onDragEnd={()=>setDragIdx(null)}
                  style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'0.75rem 1rem',background:item.tipo==='passo'?'rgba(196,169,106,0.04)':'rgba(255,255,255,0.02)',border:item.tipo==='passo'?'0.5px solid rgba(196,169,106,0.15)':'0.5px solid rgba(255,255,255,0.06)',borderRadius:'8px',cursor:editIdx===idx?'default':'grab',opacity:dragIdx===idx?0.35:1,transition:'opacity 0.15s'}}
                >
                  {editIdx===idx ? (
                    <div style={{flex:1,display:'flex',flexDirection:'column',gap:'8px'}}>
                      <div style={{display:'flex',gap:'6px'}}>
                        {[['texto','Texto'],['passo','Passo numerado']].map(([v,l])=>(
                          <button key={v} onClick={()=>setEditTipo(v)} style={{height:'24px',padding:'0 0.6rem',borderRadius:'20px',border:editTipo===v?'0.5px solid rgba(196,169,106,0.4)':'0.5px solid rgba(255,255,255,0.08)',background:editTipo===v?'rgba(196,169,106,0.1)':'rgba(255,255,255,0.03)',fontSize:'10px',color:editTipo===v?'#C4A96A':'rgba(255,255,255,0.4)',cursor:'pointer'}}>{l}</button>
                        ))}
                      </div>
                      {editTipo==='texto' && passos.length>0 && (
                        <select value={editAnexo} onChange={e=>setEditAnexo(e.target.value)} style={{...INPUT,height:'30px',background:'#1a1a1c',cursor:'pointer',fontSize:'11px'}}>
                          <option value="">Não anexar</option>
                          {passos.map((p,i)=>(
                            <option key={p.id||i} value={p.id}>Anexar ao Passo {i+1}</option>
                          ))}
                        </select>
                      )}
                      <textarea autoFocus value={editTexto} onChange={e=>setEditTexto(e.target.value)} rows={2} style={{...INPUT,height:'auto',padding:'0.5rem 0.75rem',resize:'vertical',fontSize:'12.5px'}}/>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={()=>setEditIdx(null)} style={BTN({height:'26px',fontSize:'11px'})}>Cancelar</button>
                        <button onClick={()=>gravarEdicao(idx)} style={BTN_GOLD({height:'26px',fontSize:'11px'})}>Guardar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span style={{color:'rgba(255,255,255,0.12)',fontSize:'11px',marginTop:'2px'}}>⠿</span>
                      {item.tipo==='passo' ? (
                        <span style={{width:'20px',height:'20px',borderRadius:'50%',background:'rgba(196,169,106,0.15)',color:'#C4A96A',fontSize:'11px',fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px'}}>{numeroPasso}</span>
                      ) : (
                        <span style={{color:'rgba(255,255,255,0.15)',fontSize:'13px',marginTop:'1px'}}>—</span>
                      )}
                      <span onClick={()=>abrirEdicao(idx,item)} style={{flex:1,fontSize:'13px',color:'rgba(255,255,255,0.75)',lineHeight:1.5,whiteSpace:'pre-line',cursor:'text'}}>
                        {item.texto}
                        {item.anexadoA && (()=>{ const alvo=passos.findIndex(p=>p.id===item.anexadoA); return alvo>=0 && <span style={{marginLeft:'8px',fontSize:'10px',color:'#C4A96A',opacity:0.7}}>↳ Passo {alvo+1}</span> })()}
                      </span>
                      <button onClick={()=>abrirEdicao(idx,item)} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.25)',fontSize:'12px',flexShrink:0}}>✎</button>
                      <button onClick={()=>delBloco(idx)} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,100,100,0.3)',fontSize:'12px',flexShrink:0}}>✕</button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'1rem'}}>
          <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
            {[['texto','Texto'],['passo','Passo numerado']].map(([v,l])=>(
              <button key={v} onClick={()=>setNovoTipo(v)} style={{height:'26px',padding:'0 0.75rem',borderRadius:'20px',border:novoTipo===v?'0.5px solid rgba(196,169,106,0.4)':'0.5px solid rgba(255,255,255,0.08)',background:novoTipo===v?'rgba(196,169,106,0.1)':'rgba(255,255,255,0.03)',fontSize:'11px',color:novoTipo===v?'#C4A96A':'rgba(255,255,255,0.4)',cursor:'pointer'}}>
                {l}
              </button>
            ))}
          </div>
          {novoTipo==='texto' && passos.length>0 && (
            <select value={anexoAlvo} onChange={e=>setAnexoAlvo(e.target.value)} style={{...INPUT,background:'#1a1a1c',cursor:'pointer',marginBottom:'8px'}}>
              <option value="">Não anexar (segue a ordem normal)</option>
              {passos.map((p,i)=>(
                <option key={p.id||i} value={p.id}>Anexar ao Passo {i+1} — {p.texto.slice(0,30)}{p.texto.length>30?'...':''}</option>
              ))}
            </select>
          )}
          <textarea
            value={novoTexto}
            onChange={e=>setNovoTexto(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){addBloco()}}}
            placeholder={novoTipo==='passo' ? 'Descreve este passo...' : 'Escreve o texto livre...'}
            rows={2}
            style={{...INPUT,height:'auto',padding:'0.5rem 0.75rem',resize:'vertical',marginBottom:'8px'}}
          />
          <button onClick={addBloco} style={BTN_GOLD()}>+ Adicionar bloco</button>
        </div>
      </div>
      )}
    </div>
  )
}

function ProcessoDiagrama({ processo, onEditarBloco }) {
  const itens = processo.itens || []
  const passos = itens.filter(i=>i.tipo==='passo')
  // Fluxo principal: passos + notas sem anexo (pela ordem). Notas anexadas ficam fora daqui.
  const fluxo = itens.filter(i => i.tipo==='passo' || !i.anexadoA)
  const notasPorPasso = (passoId) => itens.filter(i => i.tipo==='texto' && i.anexadoA===passoId)

  return (
    <div style={{flex:1,overflowY:'auto',padding:'2rem 1.25rem'}}>
      <div style={{maxWidth:'620px',margin:'0 auto',display:'flex',flexDirection:'column',alignItems:'center'}}>

        <div style={{padding:'0.75rem 1.5rem',borderRadius:'8px',background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.1)',fontSize:'13px',fontWeight:500,color:'rgba(255,255,255,0.7)'}}>
          Início
        </div>

        {itens.length===0 && (
          <div style={{marginTop:'1.5rem',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>Sem blocos ainda.</div>
        )}

        {fluxo.map((item, idx) => {
          const numeroPasso = item.tipo==='passo' ? passos.indexOf(item)+1 : null
          const notasAnexadas = item.tipo==='passo' ? notasPorPasso(item.id) : []
          return (
            <div key={idx} style={{display:'flex',flexDirection:'column',alignItems:'center',width:'100%'}}>
              <div style={{width:'0.5px',height:'28px',background:'rgba(255,255,255,0.15)'}}/>

              <div style={{display:'flex',alignItems:'stretch',gap:'16px',width:'100%',justifyContent:'center'}}>
                <div
                  onClick={onEditarBloco}
                  title="Clicar para editar na lista"
                  style={{
                    width:'100%', maxWidth: item.tipo==='passo' ? '380px' : '480px',
                    display:'flex', alignItems:'flex-start', gap:'12px',
                    padding:'0.9rem 1.1rem', borderRadius:'10px', cursor:'pointer',
                    background: item.tipo==='passo' ? 'rgba(196,169,106,0.08)' : 'rgba(255,255,255,0.03)',
                    border: item.tipo==='passo' ? '0.5px solid rgba(196,169,106,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                    transition:'background 0.1s',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background = item.tipo==='passo' ? 'rgba(196,169,106,0.13)' : 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e=>e.currentTarget.style.background = item.tipo==='passo' ? 'rgba(196,169,106,0.08)' : 'rgba(255,255,255,0.03)'}
                >
                  {item.tipo==='passo' ? (
                    <span style={{width:'24px',height:'24px',borderRadius:'50%',background:'rgba(196,169,106,0.2)',color:'#C4A96A',fontSize:'12px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{numeroPasso}</span>
                  ) : (
                    <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'20px',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.35)',flexShrink:0,marginTop:'2px'}}>nota</span>
                  )}
                  <span style={{fontSize:'13px',color:item.tipo==='passo'?'rgba(255,255,255,0.85)':'rgba(255,255,255,0.6)',lineHeight:1.5,whiteSpace:'pre-line'}}>{item.texto}</span>
                </div>

                {notasAnexadas.length>0 && (
                  <div style={{display:'flex',alignItems:'stretch'}}>
                    <div style={{position:'relative',width:'22px',flexShrink:0}}>
                      <div style={{position:'absolute',top:'20px',left:0,width:'22px',height:'0.5px',background:'rgba(196,169,106,0.35)'}}/>
                      {notasAnexadas.length>1 && (
                        <div style={{position:'absolute',top:'20px',bottom:'20px',left:'22px',width:'0.5px',background:'rgba(196,169,106,0.35)'}}/>
                      )}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                      {notasAnexadas.map((nota,ni)=>(
                        <div key={ni} onClick={onEditarBloco} title="Clicar para editar na lista"
                          style={{width:'190px',padding:'0.6rem 0.8rem',borderRadius:'8px',cursor:'pointer',background:'rgba(196,169,106,0.04)',border:'0.5px dashed rgba(196,169,106,0.3)',fontSize:'11.5px',color:'rgba(255,255,255,0.55)',lineHeight:1.4,whiteSpace:'pre-line'}}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(196,169,106,0.09)'}
                          onMouseLeave={e=>e.currentTarget.style.background='rgba(196,169,106,0.04)'}
                        >
                          {nota.texto}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div style={{width:'0.5px',height:'28px',background:'rgba(255,255,255,0.15)'}}/>
        <div style={{padding:'0.75rem 1.5rem',borderRadius:'8px',background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.1)',fontSize:'13px',fontWeight:500,color:'rgba(255,255,255,0.7)'}}>
          Concluído
        </div>
      </div>
    </div>
  )
}
