// Low-res render target → nearest upscale. Post: impact frames, slow-mo colour drain (keeps blood/weapon),
// ghost blur (Cao), hard-edged stepped danger vignette. No bloom, no soft glow.
import * as THREE from 'three'
import { QUALITY, Tier } from '../core/quality'

const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
const blendFrag = `uniform sampler2D tCur, tPrev; uniform float amt; varying vec2 vUv;
void main(){ gl_FragColor = mix(texture2D(tCur, vUv), texture2D(tPrev, vUv), amt); }`
const displayFrag = `uniform sampler2D tSrc; uniform int mode; uniform float desat, vig; uniform vec2 res; varying vec2 vUv;
const vec3 INK = vec3(0.0079,0.0079,0.0103); const vec3 PAPER = vec3(0.838,0.832,0.791);
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb;
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float sat = (mx - mn) / (mx + 0.0001); float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float keep = step(0.4, sat) * step(0.004, mx);
  if (mode == 1) { c = mix(l > 0.22 ? INK : PAPER, c, keep); }
  else if (mode == 2) { c = mix(l > 0.22 ? PAPER : INK, c, keep); }
  c = mix(c, mix(vec3(l), c, keep), desat);
  // stepped square vignette (hard edges, in low-res pixels)
  vec2 px = floor(vUv * res) / res; vec2 d = abs(px - 0.5) * 2.0;
  float e = max(d.x, d.y);
  float band = step(1.0 - 0.10 * vig, e) + step(1.0 - 0.05 * vig, e);
  c = mix(c, INK, min(1.0, band * 0.5) * step(0.01, vig));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`

export class Renderer {
  gl: THREE.WebGLRenderer
  rt!: THREE.WebGLRenderTarget; acc: THREE.WebGLRenderTarget[] = []
  private quad: THREE.Mesh; private qscene = new THREE.Scene(); private qcam = new THREE.Camera()
  private blendMat: THREE.ShaderMaterial; private dispMat: THREE.ShaderMaterial
  private ping = 0
  tier: Tier = 'tb'
  mode = 0; desat = 0; vig = 0; ghost = 0
  lowW = 0; lowH = 0

  constructor(canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.gl.setPixelRatio(1)
    this.blendMat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: blendFrag, uniforms: { tCur: { value: null }, tPrev: { value: null }, amt: { value: 0 } }, depthTest: false })
    this.dispMat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: displayFrag, uniforms: { tSrc: { value: null }, mode: { value: 0 }, desat: { value: 0 }, vig: { value: 0 }, res: { value: new THREE.Vector2() } }, depthTest: false })
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.dispMat); this.quad.frustumCulled = false
    this.qscene.add(this.quad)
  }

  private mkRT(w: number, h: number, depth: boolean) {
    return new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: depth })
  }

  resize(tier: Tier) {
    this.tier = tier
    const W = window.innerWidth, H = window.innerHeight
    this.gl.setSize(W, H, false)
    this.lowH = QUALITY[tier].h; this.lowW = Math.round(this.lowH * W / H)
    this.rt?.dispose(); this.acc.forEach(a => a.dispose())
    this.rt = this.mkRT(this.lowW, this.lowH, true)
    this.acc = [this.mkRT(this.lowW, this.lowH, false), this.mkRT(this.lowW, this.lowH, false)]
    ;(this.dispMat.uniforms.res.value as THREE.Vector2).set(this.lowW, this.lowH)
  }

  render(scene: THREE.Scene, cam: THREE.Camera) {
    const g = this.gl
    g.setRenderTarget(this.rt); g.render(scene, cam)
    let src = this.rt.texture
    if (QUALITY[this.tier].ghost) {
      const out = this.acc[this.ping], prev = this.acc[1 - this.ping]
      this.blendMat.uniforms.tCur.value = this.rt.texture; this.blendMat.uniforms.tPrev.value = prev.texture
      this.blendMat.uniforms.amt.value = this.ghost
      this.quad.material = this.blendMat; g.setRenderTarget(out); g.render(this.qscene, this.qcam)
      src = out.texture; this.ping = 1 - this.ping
    }
    const u = this.dispMat.uniforms
    u.tSrc.value = src; u.mode.value = this.mode; u.desat.value = this.desat; u.vig.value = this.vig
    this.quad.material = this.dispMat; g.setRenderTarget(null); g.render(this.qscene, this.qcam)
  }
}
