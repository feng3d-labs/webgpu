import"../../../modulepreload-polyfill-3cfb730f.js";import{G as p}from"../../../dat.gui.module-5ea4ba08.js";import{W as b,r as a}from"../../../Buffer-23ffa079.js";const x=`struct Uniforms {
  color0: vec4f,
  color1: vec4f,
  size: u32,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex
fn vs(@builtin(vertex_index) vertexIndex : u32) -> @builtin(position) vec4f {
  const pos = array(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let grid = vec2u(position.xy) / uni.size;
  let checker = (grid.x + grid.y) % 2 == 1;
  return select(uni.color0, uni.color1, checker);
}

`,z=async r=>{const d=await new b().init(),m={vertex:{code:x},fragment:{code:x}},s={color0:void 0,color1:void 0,size:void 0},v={uni:s},t={color0:"#FF0000",color1:"#00FFFF",size:1,resizable:!1,fullscreen(){document.fullscreenElement?document.exitFullscreen():document.body.requestFullscreen()}},o=document.querySelector("#container"),i=new p;i.addColor(t,"color0").onChange(l),i.addColor(t,"color1").onChange(l),i.add(t,"size",1,32,1).name("checker size").onChange(l),i.add(t,"fullscreen"),i.add(t,"resizable").onChange(()=>{const{resizable:e}=t,n=o.clientWidth,c=o.clientHeight;o.classList.toggle("resizable",e),o.classList.toggle("fit-container",!e),o.style.width=e?`${n}px`:"",o.style.height=e?`${c}px`:""});const u=function(){const e=new OffscreenCanvas(1,1).getContext("2d",{willReadFrequently:!0});return function(n){return e.clearRect(0,0,1,1),e.fillStyle=n,e.fillRect(0,0,1,1),[...e.getImageData(0,0,1,1).data].map(c=>c/255)}}(),g={commandEncoders:[{passEncoders:[{descriptor:{colorAttachments:[{view:{texture:{context:{canvasId:r.id}}},clearValue:[.2,.2,.2,1],loadOp:"clear",storeOp:"store"}]},renderPassObjects:[{pipeline:m,bindingResources:v,draw:{__type__:"DrawVertex",vertexCount:3}}]}]}]};function l(){a(s).color0=u(t.color0),a(s).color1=u(t.color1),a(s).size=t.size,d.submit(g)}function h(e){return e.devicePixelContentBoxSize?{width:e.devicePixelContentBoxSize[0].inlineSize,height:e.devicePixelContentBoxSize[0].blockSize}:{width:e.contentBoxSize[0].inlineSize*devicePixelRatio,height:e.contentBoxSize[0].blockSize*devicePixelRatio}}const{maxTextureDimension2D:f}=d.device.limits;new ResizeObserver(([e])=>{const{width:n,height:c}=h(e);r.width=Math.max(1,Math.min(n,f)),r.height=Math.max(1,Math.min(c,f)),l()}).observe(r)},w=document.getElementById("webgpu");z(w);
