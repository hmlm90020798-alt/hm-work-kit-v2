// useTampos.js — lógica de cálculo extraída de Tampos.jsx
// Tampos.jsx importa daqui: calcPeca, novoProjeto, totProj, uuid, f2, c1fmt
import { ANIGRACO, TIPOS_PEDRA } from '../data/anigracoData'

export function uuid() { return Math.random().toString(36).slice(2, 9) }
export function f2(n)  { return parseFloat(n || 0).toFixed(2) }
export function c1fmt(c1) { return Math.round(c1).toString() }

/**
 * Calcula o resultado de uma peça (m², pvp, c1, acabamentos).
 * Função pura — não tem efeitos secundários, fácil de testar.
 */
export function calcPeca(p) {
  const m2 = (p.segmentos || []).reduce(
    (s, sg) => s + (parseFloat(sg.comp) || 0) * (parseFloat(sg.larg) || 0), 0
  )

  let pvpTampo = 0, c1Tampo = 0, esp = null

  if (TIPOS_PEDRA.includes(p.tipo) && p.desc) {
    const mat = ANIGRACO[p.tipo]
    const ref = mat?.materiais.find(m => m.desc === p.desc && m.grupo === p.grupo)
            || mat?.materiais.find(m => m.desc === p.desc)
    esp = ref?.espessuras[p.espessura]
    if (esp) { pvpTampo = esp.pvp * m2; c1Tampo = esp.c1 * m2 }
  } else {
    pvpTampo = (parseFloat(p.precoPvp) || 0) * m2
    c1Tampo  = (parseFloat(p.precoC1)  || 0) * 100 * m2
  }

  const pvpAcab = (p.acabamentos || []).reduce((s, a) => s + (a.pvp || 0) * (a.qty || 0), 0)
  const c1Acab  = (p.acabamentos || []).reduce((s, a) => s + (a.c1  || 0) * (a.qty || 0), 0)

  return { m2, pvpTampo, c1Tampo, pvpAcab, c1Acab, pvp: pvpTampo + pvpAcab, c1raw: c1Tampo + c1Acab, esp }
}

/**
 * Total de um projecto completo (todas as peças + transporte - desconto).
 */
export function totProj(c) {
  let pvp = 0, c1 = 0
  ;(c.pecas || []).forEach(p => { const r = calcPeca(p); pvp += r.pvp; c1 += r.c1raw })
  if (c.transporte) { pvp += c.transporte.pvp; c1 += c.transporte.c1 }
  const desc = parseFloat(c.desconto) > 0
    ? (c.descontoTipo === '%' ? pvp * (parseFloat(c.desconto) / 100) : parseFloat(c.desconto))
    : 0
  return { pvp: pvp - desc, c1 }
}

/**
 * Estado inicial de um novo projecto de tampos.
 */
export function novoProjeto(tipo) {
  return {
    id: null, nome: '', contacto: '', tipo, modo: 'simples',
    pecas: [{
      id: uuid(), label: 'Peça 1', tipo, desc: '', grupo: null, espessura: '2cm',
      segmentos: [{ id: uuid(), label: 'Seg.1', comp: '', larg: '' }],
      acabamentos: []
    }],
    opcaoB: null,
    transporte: null, desconto: '', descontoTipo: '%', notas: ''
  }
}
