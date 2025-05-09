import"../../../modulepreload-polyfill-3cfb730f.js";import{G as pe}from"../../../dat.gui.module-5ea4ba08.js";import{m as i,v}from"../../../wgpu-matrix.module-82499b8f.js";import{W as de,r as ue}from"../../../Buffer-5212487c.js";const le=`@fragment
fn main(
    @location(0) fragColor: vec4<f32>
) -> @location(0) vec4<f32> {
    return fragColor;
}
`,he=`@group(1) @binding(0) var depthTexture: texture_depth_2d;

@fragment
fn main(
    @builtin(position) coord: vec4<f32>,
    @location(0) clipPos: vec4<f32>
) -> @location(0) vec4<f32> {
    let depthValue = textureLoad(depthTexture, vec2<i32>(floor(coord.xy)), 0);
    let v: f32 = abs(clipPos.z / clipPos.w - depthValue) * 2000000.0;
    return vec4<f32>(v, v, v, 1.0);
}
`,me=`@group(0) @binding(0) var depthTexture: texture_depth_2d;

@fragment
fn main(
    @builtin(position) coord: vec4<f32>
) -> @location(0) vec4<f32> {
    let depthValue = textureLoad(depthTexture, vec2<i32>(floor(coord.xy)), 0);
    return vec4<f32>(depthValue, depthValue, depthValue, 1.0);
}
`,fe=`struct Uniforms {
  modelMatrix: array<mat4x4<f32>, 5>,
}
struct Camera {
  viewProjectionMatrix: mat4x4<f32>,
}

@binding(0) @group(0) var<uniform> uniforms : Uniforms;
@binding(1) @group(0) var<uniform> camera : Camera;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragColor: vec4<f32>,
}

@vertex
fn main(
    @builtin(instance_index) instanceIdx: u32,
    @location(0) position: vec4<f32>,
    @location(1) color: vec4<f32>
) -> VertexOutput {
    var output: VertexOutput;
    output.Position = camera.viewProjectionMatrix * uniforms.modelMatrix[instanceIdx] * position;
    output.fragColor = color;
    return output;
}`,xe=`struct Uniforms {
  modelMatrix: array<mat4x4<f32>, 5>,
}
struct Camera {
  viewProjectionMatrix: mat4x4<f32>,
}

@binding(0) @group(0) var<uniform> uniforms : Uniforms;
@binding(1) @group(0) var<uniform> camera : Camera;

@vertex
fn main(
    @builtin(instance_index) instanceIdx: u32,
    @location(0) position: vec4<f32>
) -> @builtin(position) vec4<f32> {
    return camera.viewProjectionMatrix * uniforms.modelMatrix[instanceIdx] * position;
}
`,we=`struct Uniforms {
  modelMatrix: array<mat4x4<f32>, 5>,
}
struct Camera {
  viewProjectionMatrix: mat4x4<f32>,
}

@binding(0) @group(0) var<uniform> uniforms : Uniforms;
@binding(1) @group(0) var<uniform> camera : Camera;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) clipPos: vec4<f32>,
}

@vertex
fn main(
    @builtin(instance_index) instanceIdx: u32,
    @location(0) position: vec4<f32>
) -> VertexOutput {
    var output: VertexOutput;
    output.Position = camera.viewProjectionMatrix * uniforms.modelMatrix[instanceIdx] * position;
    output.clipPos = output.Position;
    return output;
}
`,ve=`@vertex
fn main(
    @builtin(vertex_index) VertexIndex: u32
) -> @builtin(position) vec4<f32> {
    const pos = array<vec2<f32>,6>(
        vec2(-1.0, -1.0),
        vec2(1.0, -1.0),
        vec2(-1.0, 1.0),
        vec2(-1.0, 1.0),
        vec2(1.0, -1.0),
        vec2(1.0, 1.0),
    );

    return vec4(pos[VertexIndex], 0.0, 1.0);
}
`,$=4*8,Pe=0,ge=4*4,P=6*2,r=1e-4,o=.5,J=new Float32Array([-1-o,-1,r,1,1,0,0,1,1-o,-1,r,1,1,0,0,1,-1-o,1,r,1,1,0,0,1,1-o,-1,r,1,1,0,0,1,1-o,1,r,1,1,0,0,1,-1-o,1,r,1,1,0,0,1,-1+o,-1,-r,1,0,1,0,1,1+o,-1,-r,1,0,1,0,1,-1+o,1,-r,1,0,1,0,1,1+o,-1,-r,1,0,1,0,1,1+o,1,-r,1,0,1,0,1,-1+o,1,-r,1,0,1,0,1]),_=1,A=5,a=_*A,O=i.identity();O[10]=-1;O[14]=1;const M=[0,1],c={0:"less",1:"greater"},g={0:1,1:0},Ce=async(t,K)=>{const I=window.devicePixelRatio||1;t.width=t.clientWidth*I,t.height=t.clientHeight*I;const j={canvasId:t.id},N=await new de().init(),p={position:{data:J,format:"float32x4",offset:Pe,arrayStride:$},color:{data:J,format:"float32x4",offset:ge,arrayStride:$}},L="depth32float",d={vertex:{code:xe},primitive:{cullFace:"back"}},u=[];u[0]={...d,depthStencil:{...d.depthStencil,depthCompare:c[0]}},u[1]={...d,depthStencil:{...d.depthStencil,depthCompare:c[1]}};const l={vertex:{code:we},fragment:{code:he},primitive:{cullFace:"back"}},C=[];C[0]={...l,depthStencil:{...l.depthStencil,depthCompare:c[0]}},C[1]={...l,depthStencil:{...l.depthStencil,depthCompare:c[1]}};const h={vertex:{code:fe},fragment:{code:le},primitive:{cullFace:"back"}},V=[];V[0]={...h,depthStencil:{...h.depthStencil,depthCompare:c[0]}},V[1]={...h,depthStencil:{...h.depthStencil,depthCompare:c[1]}};const X={vertex:{code:ve},fragment:{code:me}},R={size:[t.width,t.height],format:L},G={size:[t.width,t.height],format:L},m={colorAttachments:[],depthStencilAttachment:{view:{texture:R},depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},f=[{colorAttachments:[{view:{texture:{context:j}},clearValue:[0,0,.5,1]}],depthStencilAttachment:{view:{texture:G},depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},{colorAttachments:[{view:{texture:{context:j}},loadOp:"load"}],depthStencilAttachment:{view:{texture:G},depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}}],Z={colorAttachments:[{view:{texture:{context:{canvasId:t.id}}},clearValue:[0,0,.5,1]}]},ee={colorAttachments:[{view:{texture:{context:{canvasId:t.id}}},loadOp:"load",storeOp:"store"}]},te=[Z,ee],B={depthTexture:{texture:R}},re=new Float32Array(16),oe=new Float32Array(16),x=new Array(a),T=[];let s=0;for(let e=0;e<_;e++)for(let n=0;n<A;n++){const H=-800*s,D=1+50*s;x[s]=i.translation(v.fromValues(e-_/2+.5,(4-.2*H)*(n-A/2+1),H)),i.scale(x[s],v.fromValues(D,D,D),x[s]),s++}const F={modelMatrix:T},W={viewProjectionMatrix:re},E={viewProjectionMatrix:oe},w=[{uniforms:F,camera:W},{uniforms:F,camera:E}],ie=i.translation(v.fromValues(0,0,-12)),ne=.5*t.width/t.height,se=i.perspective(2*Math.PI/5,ne,5,9999),U=i.multiply(se,ie),ae=i.multiply(O,U);W.viewProjectionMatrix=U,E.viewProjectionMatrix=ae;const Q=i.create();function ce(){const e=Date.now()/1e3;for(let n=0;n<a;n++)i.rotate(x[n],v.fromValues(Math.sin(e),Math.cos(e),0),Math.PI/180*30,Q),ue(T)[n]=Q.slice()}const b={mode:"color"};K.add(b,"mode",["color","precision-error","depth-texture"]).onChange(k);const z=[];for(const e of M)z.push({descriptor:{...f[e],depthStencilAttachment:{...f[e].depthStencilAttachment,depthClearValue:g[e]}},renderPassObjects:[{viewport:{isYup:!1,x:t.width*e/2,y:0,width:t.width/2,height:t.height,minDepth:0,maxDepth:1},pipeline:V[e],bindingResources:{...w[e]},vertices:p,draw:{__type__:"DrawVertex",vertexCount:P,instanceCount:a,firstVertex:0,firstInstance:0}}]});const S=[];for(const e of M)S.push({descriptor:{...m,depthStencilAttachment:{...m.depthStencilAttachment,depthClearValue:g[e]}},renderPassObjects:[{viewport:{isYup:!1,x:t.width*e/2,y:0,width:t.width/2,height:t.height,minDepth:0,maxDepth:1},pipeline:u[e],bindingResources:{...w[e]},vertices:p,draw:{__type__:"DrawVertex",vertexCount:P,instanceCount:a,firstVertex:0,firstInstance:0}}]}),S.push({descriptor:{...f[e],depthStencilAttachment:{...f[e].depthStencilAttachment,depthClearValue:g[e]}},renderPassObjects:[{viewport:{isYup:!1,x:t.width*e/2,y:0,width:t.width/2,height:t.height,minDepth:0,maxDepth:1},pipeline:C[e],bindingResources:{...w[e],...B},vertices:p,draw:{__type__:"DrawVertex",vertexCount:P,instanceCount:a,firstVertex:0,firstInstance:0}}]});const y=[];for(const e of M)y.push({descriptor:{...m,depthStencilAttachment:{...m.depthStencilAttachment,depthClearValue:g[e]}},renderPassObjects:[{viewport:{isYup:!1,x:t.width*e/2,y:0,width:t.width/2,height:t.height,minDepth:0,maxDepth:1},pipeline:u[e],bindingResources:{...w[e]},vertices:p,draw:{__type__:"DrawVertex",vertexCount:P,instanceCount:a,firstVertex:0,firstInstance:0}}]}),y.push({descriptor:te[e],renderPassObjects:[{viewport:{isYup:!1,x:t.width*e/2,y:0,width:t.width/2,height:t.height,minDepth:0,maxDepth:1},pipeline:X,bindingResources:{...B},draw:{__type__:"DrawVertex",vertexCount:6,instanceCount:1,firstVertex:0,firstInstance:0}}]});let Y;function k(){let e;b.mode==="color"?e=z:b.mode==="precision-error"?e=S:e=y,Y={commandEncoders:[{passEncoders:e}]}}function q(){ce(),N.submit(Y),requestAnimationFrame(q)}k(),requestAnimationFrame(q)},Ve=new pe({width:310}),be=document.getElementById("webgpu");Ce(be,Ve);
