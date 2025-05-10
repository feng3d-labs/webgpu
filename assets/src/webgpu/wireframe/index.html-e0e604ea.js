import"../../../modulepreload-polyfill-3cfb730f.js";import{W as _,r as E}from"../../../Buffer-23ffa079.js";import{G as z}from"../../../dat.gui.module-5ea4ba08.js";import{v as y,m as p}from"../../../wgpu-matrix.module-82499b8f.js";import{m as D}from"../../../teapot-c6c08f92.js";import{c as R}from"../../../sphere-e20f19ca.js";import"../../../utils-90ee43e9.js";function q(t,i,l=[0,0,0]){const{positions:f,normals:e,triangles:s}=t,c=f.map(r=>r.map((u,b)=>u*i+l[b%3])),n=new Float32Array(c.length*6);for(let r=0;r<c.length;++r)n.set(c[r],6*r),n.set(e[r],6*r+3);const a=new Uint32Array(s.length*3);for(let r=0;r<s.length;++r)a.set(s[r],3*r);return{vertices:n,indices:a}}function A(t,i=32,l=16,f=0){const{vertices:e,indices:s}=R(t,i,l,f),c=e.length/8,n=new Float32Array(c*6);for(let a=0;a<c;++a){const r=a*8,u=a*6;n.set(e.subarray(r,r+6),u)}return{vertices:n,indices:new Uint32Array(s)}}function G({vertices:t,indices:i}){const l=new Float32Array(i.length*6),f=new Uint32Array(i.length);for(let e=0;e<i.length;e+=3){const s=[];for(let n=0;n<3;++n){const r=i[e+n]*6,u=(e+n)*6,b=t.subarray(r,r+3);l.set(b,u),s.push(b),f[e+n]=e+n}const c=y.normalize(y.cross(y.normalize(y.subtract(s[1],s[0])),y.normalize(y.subtract(s[2],s[1]))));for(let n=0;n<3;++n){const a=(e+n)*6;l.set(c,a+3)}}return{vertices:l,indices:f}}const H={teapot:q(D,1.5),sphere:A(20),jewel:G(A(20,5,3)),rock:G(A(20,32,16,.1))},L=`struct Uniforms {
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
`;function O(t,i){return t===void 0?(i=1,t=0):i===void 0&&(i=t,t=0),Math.random()*(i-t)+t}function X(t,i){return Math.floor(O(t,i))}function Y(){return[O(),O(),O(),1]}function $(t){return t[X(t.length)]}const C=`struct Uniforms {
  worldViewProjectionMatrix: mat4x4f,
  worldMatrix: mat4x4f,
  color: vec4f,
};

struct LineUniforms {
  stride: u32,
  thickness: f32,
  alphaThreshold: f32,
};

struct VSOut {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var<storage, read> positions: array<f32>;
@group(0) @binding(2) var<storage, read> indices: array<u32>;
@group(0) @binding(3) var<uniform> line: LineUniforms;

@vertex fn vsIndexedU32(@builtin(vertex_index) vNdx: u32) -> VSOut {
  // indices make a triangle so for every 3 indices we need to output
  // 6 values
  let triNdx = vNdx / 6;
  // 0 1 0 1 0 1  0 1 0 1 0 1  vNdx % 2
  // 0 0 1 1 2 2  3 3 4 4 5 5  vNdx / 2
  // 0 1 1 2 2 3  3 4 4 5 5 6  vNdx % 2 + vNdx / 2
  // 0 1 1 2 2 0  0 1 1 2 2 0  (vNdx % 2 + vNdx / 2) % 3
  let vertNdx = (vNdx % 2 + vNdx / 2) % 3;
  let index = indices[triNdx * 3 + vertNdx];

  // note:
  //
  // * if your indices are U16 you could use this
  //
  //    let indexNdx = triNdx * 3 + vertNdx;
  //    let twoIndices = indices[indexNdx / 2];  // indices is u32 but we want u16
  //    let index = (twoIndices >> ((indexNdx & 1) * 16)) & 0xFFFF;
  //
  // * if you're not using indices you could use this
  //
  //    let index = triNdx * 3 + vertNdx;

  let pNdx = index * line.stride;
  let position = vec4f(positions[pNdx], positions[pNdx + 1], positions[pNdx + 2], 1);

  var vOut: VSOut;
  vOut.position = uni.worldViewProjectionMatrix * position;
  return vOut;
}

@fragment fn fs() -> @location(0) vec4f {
  return uni.color + vec4f(0.5);
}

struct BarycentricCoordinateBasedVSOutput {
  @builtin(position) position: vec4f,
  @location(0) barycenticCoord: vec3f,
};

@vertex fn vsIndexedU32BarycentricCoordinateBasedLines(
  @builtin(vertex_index) vNdx: u32
) -> BarycentricCoordinateBasedVSOutput {
  let vertNdx = vNdx % 3;
  let index = indices[vNdx];

  // note:
  //
  // * if your indices are U16 you could use this
  //
  //    let twoIndices = indices[vNdx / 2];  // indices is u32 but we want u16
  //    let index = (twoIndices >> ((vNdx & 1) * 16)) & 0xFFFF;
  //
  // * if you're not using indices you could use this
  //
  //    let index = vNdx;

  let pNdx = index * line.stride;
  let position = vec4f(positions[pNdx], positions[pNdx + 1], positions[pNdx + 2], 1);

  var vsOut: BarycentricCoordinateBasedVSOutput;
  vsOut.position = uni.worldViewProjectionMatrix * position;

  // emit a barycentric coordinate
  vsOut.barycenticCoord = vec3f(0);
  vsOut.barycenticCoord[vertNdx] = 1.0;
  return vsOut;
}

fn edgeFactor(bary: vec3f) -> f32 {
  let d = fwidth(bary);
  let a3 = smoothstep(vec3f(0.0), d * line.thickness, bary);
  return min(min(a3.x, a3.y), a3.z);
}

@fragment fn fsBarycentricCoordinateBasedLines(
  v: BarycentricCoordinateBasedVSOutput
) -> @location(0) vec4f {
  let a = 1.0 - edgeFactor(v.barycenticCoord);
  if (a < line.alphaThreshold) {
    discard;
  }

  return vec4((uni.color.rgb + 0.5) * a, a);
}
`,J=async(t,i)=>{const l=window.devicePixelRatio||1;t.width=t.clientWidth*l,t.height=t.clientHeight*l;const f=await new _().init(),e={barycentricCoordinatesBased:!1,thickness:2,alphaThreshold:.5,animate:!0,lines:!0,depthBias:1,depthBiasSlopeScale:.5,models:!0},s=Object.values(H).map(o=>({vertices:o.vertices,indices:o.indices,vertexAttributes:{position:{data:o.vertices,format:"float32x3",offset:0,arrayStride:24},normal:{data:o.vertices,format:"float32x3",offset:12,arrayStride:24}}}));let c;function n(){c={label:"lit pipeline",vertex:{code:L},fragment:{code:L},primitive:{cullFace:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less",depthBias:e.depthBias,depthBiasSlopeScale:e.depthBiasSlopeScale}}}n();const a={label:"wireframe pipeline",vertex:{code:C,entryPoint:"vsIndexedU32"},fragment:{code:C,entryPoint:"fs"},primitive:{topology:"line-list"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less-equal"}},r={label:"barycentric coordinates based wireframe pipeline",vertex:{code:C,entryPoint:"vsIndexedU32BarycentricCoordinateBasedLines"},fragment:{code:C,entryPoint:"fsBarycentricCoordinateBasedLines",targets:[{blend:{color:{srcFactor:"one",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha"}}}]},primitive:{topology:"triangle-list"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less-equal"}},u=[],b=200;for(let o=0;o<b;++o){const v={color:Y()},h=$(s),P={uni:v},g=new Float32Array(3+1),U=new Uint32Array(g.buffer),m={bufferView:g,stride:void 0,thickness:void 0,alphaThreshold:void 0};U[0]=6;const F={uni:v,positions:{bufferView:h.vertices},indices:{bufferView:h.indices},line:m},x={uni:v,positions:{bufferView:h.vertices},indices:{bufferView:h.indices},line:m};u.push({uniformBuffer:v,lineUniformValues:g,lineUniformBuffer:m,litBindGroup:P,wireframeBindGroups:[F,x],model:h})}const T={label:"our basic canvas renderPass",colorAttachments:[{view:{texture:{context:{canvasId:t.id}}},clearValue:[.3,.3,.3,1],loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:void 0,depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}};i.add(e,"barycentricCoordinatesBased").onChange(I),i.add(e,"lines"),i.add(e,"models"),i.add(e,"animate");const N=[];function I(){N.forEach(o=>o.remove()),N.length=0,e.barycentricCoordinatesBased?N.push(i.add(e,"thickness",0,10).onChange(S),i.add(e,"alphaThreshold",0,1).onChange(S)):N.push(i.add(e,"depthBias",-3,3,1).onChange(n),i.add(e,"depthBiasSlopeScale",-1,1,.05).onChange(n))}I();function S(){u.forEach(({lineUniformBuffer:o,lineUniformValues:v})=>{o.thickness=e.thickness,o.alphaThreshold=e.alphaThreshold})}S();let V=0;function k(o){e.animate&&(V=o*.001);const v=60*Math.PI/180,h=t.clientWidth/t.clientHeight,P=p.perspective(v,h,.1,1e3),g=p.lookAt([-300,0,300],[0,0,0],[0,1,0]),U=p.multiply(P,g),m=[];if(u.forEach(({uniformBuffer:x,litBindGroup:M,model:{vertexAttributes:j,indices:B}},w)=>{const d=p.identity();p.translate(d,[0,0,Math.sin(w*3.721+V*.1)*200],d),p.rotateX(d,w*4.567,d),p.rotateY(d,w*2.967,d),p.translate(d,[0,0,Math.sin(w*9.721+V*.1)*200],d),p.rotateX(d,V*.53+w,d);const W=x.worldViewProjectionMatrix||new Float32Array(16);p.multiply(U,d,W),E(x).worldViewProjectionMatrix=W.subarray(),E(x).worldMatrix=d,e.models&&m.push({pipeline:c,bindingResources:M,vertices:j,indices:B,draw:{__type__:"DrawIndexed",indexCount:B.length}})}),e.lines){const[x,M,j]=e.barycentricCoordinatesBased?[1,1,r]:[0,2,a];u.forEach(({wireframeBindGroups:B,model:{indices:w}})=>{m.push({pipeline:j,bindingResources:B[x],draw:{__type__:"DrawVertex",vertexCount:w.length*M}})})}const F={commandEncoders:[{passEncoders:[{descriptor:T,renderPassObjects:m}]}]};f.submit(F),requestAnimationFrame(k)}requestAnimationFrame(k)},K=new z({width:310}),Q=document.getElementById("webgpu");J(Q,K);
