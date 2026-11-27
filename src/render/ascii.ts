// ASCII as a material (not a filter): body is solid ink; on death it breaks into glyph cells that drift and vanish.
// Cells are screen-space (low-res px), glyph atlas is generated; "cheap" tier = frozen glyphs.
import * as THREE from 'three'

export const ASCII_GLYPHS = ' .:-=+*#%@'

let atlas: THREE.CanvasTexture | null = null
function glyphAtlas() {
  if (atlas) return atlas
  const c = 8, n = ASCII_GLYPHS.length, cv = document.createElement('canvas'); cv.width = c * n; cv.height = c
  const g = cv.getContext('2d')!; g.fillStyle = '#fff'; g.font = 'bold 8px monospace'; g.textBaseline = 'top'
  for (let i = 0; i < n; i++) g.fillText(ASCII_GLYPHS[i], i * c + 1, 0)
  atlas = new THREE.CanvasTexture(cv); atlas.magFilter = atlas.minFilter = THREE.NearestFilter; atlas.generateMipmaps = false
  return atlas
}

const vert = `uniform float dissolve; varying vec3 vN;
float h1(float n){ return fract(sin(n * 91.3458) * 47453.5453); }
void main(){
  vN = normalMatrix * normal;
  vec3 p = position + normal * dissolve * 0.25 * h1(dot(position, vec3(12.9, 78.2, 37.7)));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`
const frag = `uniform vec3 color; uniform float dissolve, time; uniform sampler2D atlas; uniform float cells; varying vec3 vN;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 q = gl_FragCoord.xy / 8.0, cell = floor(q), f = fract(q);
  float h = h2(cell);
  if (dissolve <= 0.0) { gl_FragColor = vec4(color, 1.0); return; }
  float gone = step(h, dissolve);               // this cell has turned into a glyph
  if (gone > 0.5) {
    if (dissolve * 1.25 - h > 0.95) discard;   // late: glyph blinks out
    float idx = floor(mod(h2(cell + floor(time * cells)) * 9.0 + 1.0, 10.0));
    float a = texture2D(atlas, vec2((idx + f.x) / 10.0, f.y)).r;
    if (a < 0.5) discard;
  }
  gl_FragColor = vec4(color, 1.0);
}`

export function makeAsciiMaterial(color: number, cheap = false) {
  return new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: { color: { value: new THREE.Color(color) }, dissolve: { value: 0 }, time: { value: 0 }, atlas: { value: glyphAtlas() }, cells: { value: cheap ? 0 : 8 } },
  })
}
export const setDissolve = (m: THREE.ShaderMaterial, d: number, time: number) => { m.uniforms.dissolve.value = d; m.uniforms.time.value = time }
