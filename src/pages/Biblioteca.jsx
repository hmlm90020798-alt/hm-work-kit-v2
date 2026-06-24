import { useState, useEffect, useRef } from 'react'
import CopyRef from '../components/CopyRef'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase/config'
import { collection, doc, onSnapshot, setDoc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore'

const ICONES = {
  acessorios:'🔩', aquecimentoeconforto325:'🔥', caixilharia:'🪟',
  colas:'🎨', decoracao:'🪴', eletro:'⚡', ferragens:'🔧',
  iluminacao:'💡', limpeza:'🧹', materialpro:'📦',
  pavimentoerevestimento1694:'🟫', sanitarios:'🚿', tampos:'⬛',
}
const CORES = {
  acessorios:'blue', aquecimentoeconforto325:'pink', caixilharia:'gray',
  colas:'coral', decoracao:'purple', eletro:'amber', ferragens:'gray',
  iluminacao:'amber', limpeza:'teal', materialpro:'teal',
  pavimentoerevestimento1694:'green', sanitarios:'blue', tampos:'teal',
}
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

const SORT_OPTS = [
  { value:'ref',       label:'Referência' },
  { value:'desc',      label:'Nome A-Z' },
  { value:'price_asc', label:'Preço ↑' },
  { value:'price_desc',label:'Preço ↓' },
  { value:'supplier',  label:'Fornecedor' },
]

function sortArts(arts, sort) {
  return [...arts].sort((a,b) => {
    if (sort==='price_asc')  return (a.price||0)-(b.price||0)
    if (sort==='price_desc') return (b.price||0)-(a.price||0)
    if (sort==='supplier')   return (a.supplier||'').localeCompare(b.supplier||'')
    if (sort==='desc')       return (a.desc||'').localeCompare(b.desc||'')
    // ordenação por ref — estrelas primeiro, apenas neste modo
    if (a.star && !b.star) return -1
    if (!a.star && b.star) return 1
    return (a.ref||'').localeCompare(b.ref||'')
  })
}

const BTN = (extra={}) => ({
  height:'32px', padding:'0 0.875rem', borderRadius:'8px',
  border:'0.5px solid rgba(255,255,255,0.1)',
  background:'rgba(255,255,255,0.04)',
  fontSize:'11.5px', color:'rgba(255,255,255,0.55)',
  cursor:'pointer', display:'flex', alignItems:'center', gap:'5px',
  whiteSpace:'nowrap', ...extra
})
const BTN_GOLD = (extra={}) => BTN({
  background:'rgba(196,169,106,0.12)',
  border:'0.5px solid rgba(196,169,106,0.35)',
  color:'#C4A96A', ...extra
})
const INPUT_STYLE = {
  background:'rgba(255,255,255,0.04)',
  border:'0.5px solid rgba(255,255,255,0.08)',
  borderRadius:'8px', padding:'0 0.75rem', height:'34px',
  fontSize:'12px', color:'rgba(255,255,255,0.7)', outline:'none', width:'100%'
}

export default function Biblioteca() {
  const navigate = useNavigate()
  const [orcContexto, setOrcContexto] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orc_contexto')) } catch { return null }
  })
  const [cats, setCats]           = useState([])
  const [arts, setArts]           = useState([])
  const [activeCat, setActiveCat] = useState(null)
  const [activeSub, setActiveSub] = useState('')
  const [vistaHome, setVistaHome] = useState(true)
  const [search, setSearch]       = useState('')
  const [sort, setSort]           = useState('ref')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [onlyStars, setOnlyStars] = useState(false)
  const [artModal, setArtModal]   = useState(false)
  const [catModal, setCatModal]   = useState(false)
  const [editId, setEditId]       = useState(null)
  const [form, setForm] = useState({ ref:'',desc:'',cat:'',sub:'',price:'',supplier:'',link:'',notes:'',star:false })

  useEffect(() => {
    const u1 = onSnapshot(collection(db,'categorias'), snap => {
      setCats(snap.docs.map(d => ({id:d.id,...d.data()})))
    })
    const u2 = onSnapshot(collection(db,'artigos'), snap => {
      setArts(snap.docs.map(d => ({id:d.id,...d.data()})))
    })
    return () => { u1(); u2() }
  }, [])

  const catsSorted = [...cats].sort((a,b)=>(a.order??999)-(b.order??999))
  const activeCatObj = cats.find(c=>c.name===activeCat)
  const subs = activeCatObj?.subs?.length > 0 ? activeCatObj.subs : []

  const entrarCat = (name) => { setActiveCat(name); setActiveSub(''); setSearch(''); setVistaHome(false) }
  const voltarHome = () => { setVistaHome(true); setActiveCat(null); setActiveSub(''); setSearch(''); setSupplierFilter(''); setOnlyStars(false) }

  const suppliersAvailable = [...new Set(
    arts.filter(a => !activeCat || activeCat==='Todos' ? true : activeSub ? (a.cat===activeCat&&a.sub===activeSub) : a.cat===activeCat)
      .map(a=>a.supplier).filter(Boolean)
  )].sort()

  const baseFiltered = arts.filter(a => {
    const mc = !activeCat||activeCat==='Todos' ? true : activeSub ? (a.cat===activeCat&&a.sub===activeSub) : a.cat===activeCat
    const q = search.toLowerCase()
    const mq = !q || [a.ref,a.desc,a.cat,a.sub,a.supplier,a.notes].some(v=>v&&v.toLowerCase().includes(q))
    const ms = !supplierFilter || a.supplier===supplierFilter
    const mstar = !onlyStars || a.star
    return mc && mq && ms && mstar
  })
  const filtered = sortArts(baseFiltered, sort)

  const openAdd = () => {
    setEditId(null)
    setForm({ref:'',desc:'',cat:activeCat&&activeCat!=='Todos'?activeCat:'',sub:activeSub,price:'',supplier:'',link:'',notes:'',star:false})
    setArtModal(true)
  }
  const openEdit = (a) => {
    setEditId(a.id)
    setForm({ref:a.ref||'',desc:a.desc||'',cat:a.cat||'',sub:a.sub||'',price:a.price||'',supplier:a.supplier||'',link:a.link||'',notes:a.notes||'',star:a.star||false})
    setArtModal(true)
  }
  const saveArt = async () => {
    const data = {...form, price: parseFloat(form.price)||0}
    if (editId) await updateDoc(doc(db,'artigos',editId), data)
    else await addDoc(collection(db,'artigos'), data)
    setArtModal(false)
  }
  const delArt = async (id, desc) => {
    if (!confirm(`Eliminar "${desc}"?`)) return
    await deleteDoc(doc(db,'artigos',id))
  }
  const toggleStar = async (a) => {
    await updateDoc(doc(db,'artigos',a.id), {star:!a.star})
  }

  const countFor = (name) => arts.filter(a=>a.cat===name).length

  const addToOrc = (art) => {
    if (!orcContexto) return
    const artigo = { ref: art.ref, desc: art.desc, preco: art.price||0, supplier: art.supplier||'', cat: art.cat||'', sub: art.sub||'', link: art.link||'' }
    localStorage.setItem('orc_pendente_artigo', JSON.stringify({ secaoId: orcContexto.secaoId, artigo }))
    localStorage.removeItem('orc_contexto')
    setOrcContexto(null)
    navigate('/orcamento')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>

      {/* BANNER ORÇAMENTO ATIVO */}
      {orcContexto && (
        <div style={{background:'rgba(196,169,106,0.08)',borderBottom:'0.5px solid rgba(196,169,106,0.2)',padding:'0.5rem 1.25rem',display:'flex',alignItems:'center',gap:'10px',flexShrink:0}}>
          <span style={{fontSize:'12px',color:'#C4A96A',flex:1}}>
            A adicionar para: <strong>{orcContexto.secaoNome}</strong>
          </span>
          <button onClick={()=>{localStorage.removeItem('orc_contexto');setOrcContexto(null);navigate('/orcamento')}} style={{height:'26px',padding:'0 0.75rem',borderRadius:'6px',border:'0.5px solid rgba(196,169,106,0.25)',background:'transparent',fontSize:'11px',color:'rgba(196,169,106,0.6)',cursor:'pointer'}}>
            Cancelar
          </button>
        </div>
      )}
      {/* TOPBAR */}
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 1.25rem',height:'52px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,13,15,0.95)',backdropFilter:'blur(12px)'}}>
        {!vistaHome && (
          <button onClick={voltarHome} style={BTN()}>← Biblioteca</button>
        )}
        <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'0 0.75rem',height:'34px'}}>
          <span style={{color:'rgba(255,255,255,0.25)',fontSize:'14px'}}>🔍</span>
          <input
            value={search}
            onChange={e=>{setSearch(e.target.value); if(e.target.value&&vistaHome){setVistaHome(false);setActiveCat(null)}}}
            placeholder={vistaHome ? 'Pesquisar em toda a biblioteca...' : `Filtrar em ${activeCat||'todos'}...`}
            style={{border:'none',background:'transparent',outline:'none',fontSize:'12px',color:'rgba(255,255,255,0.7)',width:'100%'}}
          />
          {search && <span onClick={()=>{setSearch('');if(!activeCat)setVistaHome(true)}} style={{cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:'13px'}}>✕</span>}
        </div>

        {/* Filtros */}
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{height:'32px',padding:'0 0.75rem',borderRadius:'8px',border:'0.5px solid rgba(255,255,255,0.1)',background:'#1a1a1c',color:'rgba(255,255,255,0.65)',fontSize:'11.5px',cursor:'pointer',outline:'none'}}>
          {SORT_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {suppliersAvailable.length>0 && !vistaHome && (
          <select value={supplierFilter} onChange={e=>setSupplierFilter(e.target.value)} style={{height:'32px',padding:'0 0.75rem',borderRadius:'8px',border:'0.5px solid rgba(255,255,255,0.1)',background:'#1a1a1c',color:'rgba(255,255,255,0.65)',fontSize:'11.5px',cursor:'pointer',outline:'none',maxWidth:'160px'}}>
            <option value=''>Todos os fornecedores</option>
            {suppliersAvailable.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <button
          onClick={()=>setOnlyStars(!onlyStars)}
          style={onlyStars ? BTN_GOLD({boxShadow:'0 0 10px rgba(196,169,106,0.3)'}) : BTN()}
        >
          ★ Estrelas
        </button>

        <button onClick={()=>setArtModal(true)||openAdd()} style={BTN_GOLD()}>+ Artigo</button>
      </div>



      {/* CHIPS DE SUBCATEGORIAS */}
      {!vistaHome && subs.length>0 && (
        <div style={{display:'flex',gap:'6px',padding:'6px 1.25rem',overflowX:'auto',flexShrink:0,borderBottom:'0.5px solid rgba(255,255,255,0.04)',scrollbarWidth:'none'}}>
          {['Todos',...subs].map(s=>(
            <button key={s} onClick={()=>setActiveSub(s==='Todos'?'':s)} style={{...BTN((activeSub===''&&s==='Todos')||(activeSub===s)?{background:'rgba(196,169,106,0.08)',borderColor:'rgba(196,169,106,0.25)',color:'#C4A96A'}:{}),borderRadius:'20px',height:'26px',fontSize:'11px'}}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* CONTEÚDO */}
      <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>

        {/* VISTA HOME — cartões de categorias */}
        {vistaHome && !search && (
          <>
            <div style={{fontSize:'10px',letterSpacing:'0.07em',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:'0.875rem'}}>
              Categorias · {catsSorted.length} categorias
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'10px',marginBottom:'1.5rem'}}>
              {catsSorted.map(cat => {
                const cor = CORES[cat.id]||'gray'
                const c = COR_MAP[cor]
                return (
                  <div key={cat.id} onClick={()=>entrarCat(cat.name)} style={{background:'rgba(255,255,255,0.04)',backdropFilter:'blur(12px)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'1rem 0.875rem',cursor:'pointer',position:'relative',overflow:'hidden',transition:'all 0.2s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(196,169,106,0.3)';e.currentTarget.style.background='rgba(255,255,255,0.07)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';e.currentTarget.style.background='rgba(255,255,255,0.04)'}}>
                    <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)'}}/>
                    <div style={{width:'36px',height:'36px',borderRadius:'8px',background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'0.75rem',fontSize:'18px',boxShadow:`0 0 14px ${c.glow}`}}>
                      {cat.icon || ICONES[cat.id] || '📦'}
                    </div>
                    <div style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.8)',marginBottom:'3px'}}>{cat.name}</div>
                    <div style={{fontSize:'11px',color:'rgba(255,255,255,0.28)'}}>{countFor(cat.name)} artigos</div>
                  </div>
                )
              })}
              <div onClick={()=>setCatModal(true)} style={{background:'transparent',border:'0.5px dashed rgba(255,255,255,0.1)',borderRadius:'12px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'5px',minHeight:'96px',cursor:'pointer'}}>
                <span style={{fontSize:'18px',color:'rgba(255,255,255,0.18)'}}>+</span>
                <span style={{fontSize:'11px',color:'rgba(255,255,255,0.2)'}}>Nova categoria</span>
              </div>
            </div>
          </>
        )}

        {/* VISTA LISTA — artigos */}
        {(!vistaHome || search) && (
          <>
            <div style={{fontSize:'10px',letterSpacing:'0.07em',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:'0.875rem'}}>
              {filtered.length} artigos{activeCat ? ` · ${activeCat}` : ''}{activeSub ? ` · ${activeSub}` : ''}
            </div>
            {filtered.length===0 ? (
              <div style={{color:'rgba(255,255,255,0.2)',fontSize:'13px',padding:'3rem 0',textAlign:'center'}}>Nenhum artigo encontrado.</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                {filtered.map(art=>(
                  <CardArtigo key={art.id} art={art} onEdit={openEdit} onDel={delArt} onStar={toggleStar} orcContexto={orcContexto} onAddOrc={addToOrc} search={search} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL ARTIGO */}
      {artModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}}>
          <div style={{background:'#161618',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'16px',padding:'1.5rem',width:'480px',maxWidth:'90vw',maxHeight:'85vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
              <span style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>{editId?'Editar artigo':'Novo artigo'}</span>
              <button onClick={()=>setArtModal(false)} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'18px',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{display:'grid',gap:'10px'}}>
              {[['ref','Referência'],['desc','Descrição'],['supplier','Fornecedor'],['link','Link'],['notes','Notas']].map(([k,l])=>(
                <div key={k}>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>{l}</div>
                  {k==='desc'||k==='notes' ? (
                    <textarea value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} rows={k==='desc'?2:2} style={{...INPUT_STYLE,height:'auto',padding:'0.5rem 0.75rem',resize:'vertical'}}/>
                  ) : (
                    <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={INPUT_STYLE}/>
                  )}
                </div>
              ))}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>Preço (€)</div>
                  <input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} style={INPUT_STYLE}/>
                </div>
                <div>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>Categoria</div>
                  <select value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value,sub:''}))} style={{...INPUT_STYLE,cursor:'pointer'}}>
                    <option value=''>Selecionar</option>
                    {catsSorted.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              {form.cat && cats.find(c=>c.name===form.cat)?.subs?.length>0 && (
                <div>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>Subcategoria</div>
                  <select value={form.sub} onChange={e=>setForm(f=>({...f,sub:e.target.value}))} style={{...INPUT_STYLE,cursor:'pointer'}}>
                    <option value=''>—</option>
                    {cats.find(c=>c.name===form.cat)?.subs?.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',marginTop:'4px'}}>
                <input type="checkbox" checked={form.star} onChange={e=>setForm(f=>({...f,star:e.target.checked}))} style={{accentColor:'#C4A96A'}}/>
                <span style={{fontSize:'12px',color:'rgba(255,255,255,0.6)'}}>★ Artigo estrela</span>
              </label>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'8px',marginTop:'1.25rem'}}>
              <button onClick={()=>setArtModal(false)} style={BTN()}>Cancelar</button>
              <button onClick={saveArt} style={BTN_GOLD()}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Highlight({ text, query }) {
  if (!query || !text) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{background:"rgba(196,169,106,0.3)",color:"#C4A96A",borderRadius:"2px",padding:"0 1px"}}>{text.slice(idx, idx+query.length)}</mark>
      {text.slice(idx+query.length)}
    </span>
  )
}

function CardArtigo({ art, onEdit, onDel, onStar, orcContexto, onAddOrc, search }) {
  const [open, setOpen] = useState(false)
  const isStar = art.star
  const label = [art.cat, art.sub].filter(Boolean).join(' · ')

  return (
    <div
      onClick={()=>setOpen(!open)}
      style={{
        background: open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        border: isStar
          ? '0.5px solid rgba(240,192,64,0.35)'
          : open ? '0.5px solid rgba(255,255,255,0.1)' : '0.5px solid rgba(255,255,255,0.06)',
        borderLeft: isStar ? '2px solid #f0c040' : undefined,
        borderRadius:'10px',
        padding:'0.75rem 1rem',
        cursor:'pointer',
        transition:'all 0.15s',
        boxShadow: isStar ? '0 0 12px rgba(240,192,64,0.12), inset 0 0 20px rgba(240,192,64,0.04)' : 'none',
        position:'relative',
        overflow:'hidden',
      }}
    >
      {isStar && <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent,rgba(240,192,64,0.4),transparent)'}}/>}

      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
            {isStar && <span style={{color:'#f0c040',fontSize:'12px',flexShrink:0}}>★</span>}
            <CopyRef refCode={art.ref} />
            {art.sub && <span style={{fontSize:'10px',padding:'1px 7px',borderRadius:'20px',background:'rgba(196,169,106,0.08)',color:'rgba(196,169,106,0.6)',flexShrink:0}}>{art.sub}</span>}
          </div>
          <div style={{fontSize:'12.5px',color:'rgba(255,255,255,0.75)',lineHeight:1.4,whiteSpace:open?'normal':'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}><Highlight text={art.desc} query={search}/></div>
          {art.supplier && <div style={{fontSize:'10.5px',color:'rgba(255,255,255,0.28)',marginTop:'2px'}}><Highlight text={art.supplier} query={search}/></div>}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
          {art.price>0 && <span style={{fontSize:'13px',fontWeight:500,color:'#C4A96A'}}>{Number(art.price).toFixed(2)} €</span>}
          {art.link && (
            <a href={art.link} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',textDecoration:'none',padding:'4px 7px',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'6px'}}>↗</a>
          )}
          {orcContexto && (
            <button onClick={e=>{e.stopPropagation();onAddOrc(art)}} style={{height:'26px',padding:'0 0.75rem',borderRadius:'6px',border:'0.5px solid rgba(196,169,106,0.35)',background:'rgba(196,169,106,0.1)',fontSize:'11px',color:'#C4A96A',cursor:'pointer',whiteSpace:'nowrap'}}>
              + Orçamento
            </button>
          )}
          <button onClick={e=>{e.stopPropagation();onStar(art)}} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:'14px',color:isStar?'#f0c040':'rgba(255,255,255,0.2)',padding:'4px'}}>{isStar?'★':'☆'}</button>
          <button onClick={e=>{e.stopPropagation();onEdit(art)}} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:'13px',color:'rgba(255,255,255,0.3)',padding:'4px'}}>✎</button>
          <button onClick={e=>{e.stopPropagation();onDel(art.id,art.desc)}} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:'13px',color:'rgba(255,100,100,0.4)',padding:'4px'}}>✕</button>
        </div>
      </div>

      {open && (
        <div style={{marginTop:'10px',paddingTop:'10px',borderTop:'0.5px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:art.notes?'6px':'0'}}>
            {label && <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'20px',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.4)'}}>{label}</span>}
            {art.supplier && <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'20px',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.4)'}}>{art.supplier}</span>}
          </div>
          {art.notes && <div style={{fontSize:'12px',color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>{art.notes}</div>}
        </div>
      )}
    </div>
  )
}
