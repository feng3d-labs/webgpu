import"../../../modulepreload-polyfill-3cfb730f.js";import{W as E,r as F,g as G}from"../../../Buffer-23ffa079.js";import{G as R}from"../../../dat.gui.module-5ea4ba08.js";import{m as o}from"../../../wgpu-matrix.module-82499b8f.js";const O=`struct Uniforms {
  worldViewProjectionMatrix: mat4x4f,
  worldMatrix: mat4x4f,
  color: vec4f,
};

struct Vertex {
  @location(0) position: vec4f,
  @location(1) normal: vec3f,
};

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(vin: Vertex) -> VSOut {
  var vOut: VSOut;
  vOut.position = uni.worldViewProjectionMatrix * vin.position;
  vOut.normal = (uni.worldMatrix * vec4f(vin.normal, 0)).xyz;
  return vOut;
}

@fragment fn fs(vin: VSOut) -> @location(0) vec4f {
  let lightDirection = normalize(vec3f(4, 10, 6));
  let light = dot(normalize(vin.normal), lightDirection) * 0.5 + 0.5;
  return vec4f(uni.color.rgb * light, uni.color.a);
}
`,Q=document.querySelector("#info"),q=async(r,V)=>{const f={animate:!0};V.add(f,"animate");const m=window.devicePixelRatio;r.width=r.clientWidth*m,r.height=r.clientHeight*m;const P=await new E().init(),S={vertex:{code:O},fragment:{code:O},primitive:{topology:"triangle-list",cullFace:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less"}},l=[{position:[-1,0,0],id:"🟥",color:[1,0,0,1]},{position:[1,0,0],id:"🟨",color:[1,1,0,1]},{position:[0,-1,0],id:"🟩",color:[0,.5,0,1]},{position:[0,1,0],id:"🟧",color:[1,.6,0,1]},{position:[0,0,-1],id:"🟦",color:[0,0,1,1]},{position:[0,0,1],id:"🟪",color:[.5,0,.5,1]}].map(({position:t,id:i,color:n})=>{const s=new Uint8Array(160),c=new Float32Array(160/4),h=c.subarray(0,16),u=c.subarray(16,32);return c.subarray(32,36).set(n),{id:i,position:t.map(d=>d*10),uniformBuffer:s,uniformValues:c,worldInverseTranspose:u,worldViewProjection:h}}),j=new Float32Array([1,1,-1,1,0,0,1,1,1,1,0,0,1,-1,1,1,0,0,1,-1,-1,1,0,0,-1,1,1,-1,0,0,-1,1,-1,-1,0,0,-1,-1,-1,-1,0,0,-1,-1,1,-1,0,0,-1,1,1,0,1,0,1,1,1,0,1,0,1,1,-1,0,1,0,-1,1,-1,0,1,0,-1,-1,-1,0,-1,0,1,-1,-1,0,-1,0,1,-1,1,0,-1,0,-1,-1,1,0,-1,0,1,1,1,0,0,1,-1,1,1,0,0,1,-1,-1,1,0,0,1,1,-1,1,0,0,1,-1,1,-1,0,0,-1,1,1,-1,0,0,-1,1,-1,-1,0,0,-1,-1,-1,-1,0,0,-1]),p=new Uint16Array([0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11,12,13,14,12,14,15,16,17,18,16,18,19,20,21,22,20,22,23]),v=j,_={colorAttachments:[{view:{texture:{context:{canvasId:r.id}}},clearValue:[.5,.5,.5,1],loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},B={pipeline:S,vertices:{position:{data:v,offset:0,arrayStride:6*4,format:"float32x3"},normal:{data:v,offset:12,arrayStride:6*4,format:"float32x3"}},indices:p,draw:{__type__:"DrawIndexed",indexCount:p.length},bindingResources:{uni:{bufferView:void 0}}},b=l.map(t=>({...B,bindingResources:{uni:{bufferView:t.uniformBuffer}}})),A=b.map(t=>({__type__:"OcclusionQuery",renderObjects:[t]})),I={commandEncoders:[{passEncoders:[{descriptor:_,renderPassObjects:A,onOcclusionQuery(t,i){const n=l.filter((e,s)=>i[s]).map(({id:e})=>e).join("");Q.textContent=`visible: ${n}`}}]}]},M=(t,i,n)=>t+(i-t)*n,z=(t,i,n)=>t.map((e,s)=>M(e,i[s],n)),C=t=>Math.sin(t*Math.PI*2)*.5+.5;let a=0,w=0;function g(t){t*=.001;const i=t-w;w=t,f.animate&&(a+=i);const n=o.perspective(30*Math.PI/180,r.clientWidth/r.clientHeight,.5,100),e=o.identity();o.rotateX(e,a,e),o.rotateY(e,a*.7,e),o.translate(e,z([0,0,5],[0,0,40],C(a*.2)),e);const s=o.inverse(e),c=o.multiply(n,s);l.forEach(({uniformBuffer:h,uniformValues:u,worldViewProjection:y,worldInverseTranspose:d,position:U},W)=>{const x=o.translation(U);o.transpose(o.inverse(x),d),o.multiply(c,x,y);const D=b[W].bindingResources.uni.bufferView;F(G(D)).data=u.subarray()}),P.submit(I),requestAnimationFrame(g)}requestAnimationFrame(g)},L=new R({width:310}),H=document.getElementById("webgpu");q(H,L);
