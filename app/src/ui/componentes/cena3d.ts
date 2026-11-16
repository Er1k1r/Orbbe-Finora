/**
 * Mini cena 3D de um bem financiado. Carregada sob demanda (dynamic import) por BemEmMovimento: o `three` não entra
 * no pacote inicial. A pista em anel mostra o contrato: arco verde = parcelas pagas, arco vermelho = em aberto.
 */
import {
  AmbientLight, BoxGeometry, ConeGeometry, CylinderGeometry, DirectionalLight, Group, Mesh, MeshStandardMaterial,
  PerspectiveCamera, Scene, TorusGeometry, WebGLRenderer, type BufferGeometry, type Material, type Object3D,
} from 'three'
import type { TipoBem } from '../../domain/tipos'

export interface OpcoesCena { tipo: TipoBem; pago: number; animar: boolean }

const COR = { verde: 0x2f9e5c, vermelho: 0xc7352d, azul: 0x0f7f88, limao: 0xd4f55a, claro: 0xe4f2f0, escuro: 0x10262b }
const RAIO = 1.6

const mat = (cor: number) => new MeshStandardMaterial({ color: cor, roughness: 0.55, metalness: 0.15 })
const caixa = (l: number, a: number, p: number, cor: number, x = 0, y = 0, z = 0) => {
  const m = new Mesh(new BoxGeometry(l, a, p), mat(cor))
  m.position.set(x, y, z)
  return m
}
/** Roda com eixo no Z (largura do veículo no Z); `giro` guarda as rodas para a animação. */
function roda(raio: number, x: number, y: number, z: number, giro: Object3D[]) {
  const g = new CylinderGeometry(raio, raio, 0.1, 18)
  g.rotateX(Math.PI / 2)
  const m = new Mesh(g, mat(COR.escuro))
  m.position.set(x, y, z)
  giro.push(m)
  return m
}

function carro(giro: Object3D[]) {
  const g = new Group()
  g.add(caixa(0.95, 0.24, 0.46, COR.azul, 0, 0.2, 0))
  g.add(caixa(0.5, 0.2, 0.4, COR.claro, -0.05, 0.42, 0))
  g.add(caixa(0.06, 0.07, 0.12, COR.limao, 0.48, 0.24, 0.14))
  g.add(caixa(0.06, 0.07, 0.12, COR.limao, 0.48, 0.24, -0.14))
  for (const x of [-0.3, 0.3]) for (const z of [-0.25, 0.25]) g.add(roda(0.12, x, 0.12, z, giro))
  return g
}
function moto(giro: Object3D[]) {
  const g = new Group()
  g.add(caixa(0.5, 0.14, 0.12, COR.azul, 0, 0.26, 0))
  g.add(caixa(0.22, 0.08, 0.14, COR.limao, -0.1, 0.36, 0))
  g.add(caixa(0.04, 0.3, 0.04, COR.claro, 0.28, 0.36, 0))
  for (const x of [-0.33, 0.33]) g.add(roda(0.15, x, 0.15, 0, giro))
  return g
}
function casa() {
  const g = new Group()
  g.add(caixa(1.1, 0.7, 1.1, COR.claro, 0, 0.35, 0))
  const telhado = new Mesh(new ConeGeometry(0.95, 0.6, 4), mat(COR.limao))
  telhado.position.y = 1.0
  telhado.rotation.y = Math.PI / 4
  g.add(telhado)
  g.add(caixa(0.22, 0.38, 0.04, COR.azul, 0, 0.19, 0.56))
  g.add(caixa(0.2, 0.2, 0.04, COR.azul, 0.33, 0.45, 0.56))
  return g
}
function moeda() {
  const g = new Group()
  const c = new Mesh(new CylinderGeometry(0.6, 0.6, 0.12, 28), mat(COR.limao))
  c.rotation.x = Math.PI / 2
  g.add(c)
  return g
}

function anel(arco: number, cor: number, inicio: number) {
  const m = new Mesh(new TorusGeometry(RAIO, 0.09, 8, 64, Math.max(arco, 0.0001)), mat(cor))
  m.rotation.z = inicio
  return m
}

export function montarCena(canvas: HTMLCanvasElement, o: OpcoesCena): () => void {
  const largura = canvas.clientWidth || 160
  const altura = canvas.clientHeight || 96
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(largura, altura, false)

  const cena = new Scene()
  const camera = new PerspectiveCamera(36, largura / altura, 0.1, 50)
  camera.position.set(0, 2.9, 4.5)
  camera.lookAt(0, 0.1, 0)
  cena.add(new AmbientLight(0xffffff, 1.15))
  const sol = new DirectionalLight(0xffffff, 2.2)
  sol.position.set(3, 5, 4)
  cena.add(sol)

  const pago = Math.min(Math.max(o.pago, 0), 1)
  const pista = new Group()
  pista.rotation.x = -Math.PI / 2 // o anel deita no chão
  if (pago > 0) pista.add(anel(pago * Math.PI * 2, COR.verde, 0))
  if (pago < 1) pista.add(anel((1 - pago) * Math.PI * 2, COR.vermelho, pago * Math.PI * 2))
  cena.add(pista)

  const giro: Object3D[] = []
  const corpo = o.tipo === 'carro' ? carro(giro) : o.tipo === 'moto' ? moto(giro) : o.tipo === 'casa' ? casa() : moeda()
  const anda = o.tipo === 'carro' || o.tipo === 'moto'
  cena.add(corpo)

  const quadro = (t: number) => {
    if (anda) {
      const a = t * 0.9
      corpo.position.set(Math.cos(a) * RAIO, 0.09, -Math.sin(a) * RAIO)
      corpo.rotation.y = a + Math.PI / 2
      for (const r of giro) r.rotation.z -= 0.2
    } else if (o.tipo === 'casa') {
      corpo.rotation.y = t * 0.6
      corpo.position.y = 0.05 + Math.sin(t * 1.4) * 0.04
    } else {
      corpo.rotation.y = t * 1.6
      corpo.position.y = 0.7 + Math.sin(t * 1.4) * 0.06
    }
    renderer.render(cena, camera)
  }

  let raf = 0
  if (o.animar) {
    const inicio = performance.now()
    const laco = (agora: number) => { quadro((agora - inicio) / 1000); raf = requestAnimationFrame(laco) }
    raf = requestAnimationFrame(laco)
  } else {
    quadro(0.6) // sem movimento: um quadro parado, já com o carro na pista
  }

  return () => {
    cancelAnimationFrame(raf)
    cena.traverse((n) => {
      const m = n as Mesh
      if (m.geometry) (m.geometry as BufferGeometry).dispose()
      if (m.material) (m.material as Material).dispose()
    })
    renderer.dispose()
  }
}
