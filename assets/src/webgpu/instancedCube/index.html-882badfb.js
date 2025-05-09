import"../../../modulepreload-polyfill-3cfb730f.js";import{W as O,r as C}from"../../../Buffer-5212487c.js";import{m as o,v as u}from"../../../wgpu-matrix.module-82499b8f.js";import{a as b,b as j,d as w,e as S,c as A}from"../../../cube-9c7624af.js";import{v as I}from"../../../vertexPositionColor.frag-aa0bc14e.js";const U=`struct Uniforms {
  modelViewProjectionMatrix: array<mat4x4<f32>, 16>,
}

@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragUV: vec2<f32>,
  @location(1) fragPosition: vec4<f32>,
}

@vertex
fn main(
    @builtin(instance_index) instanceIdx: u32,
    @location(0) position: vec4<f32>,
    @location(1) uv: vec2<f32>
) -> VertexOutput {
    var output: VertexOutput;
    output.Position = uniforms.modelViewProjectionMatrix[instanceIdx] * position;
    output.fragUV = uv;
    output.fragPosition = 0.5 * (position + vec4(1.0));
    return output;
}
`,W=async t=>{const m=window.devicePixelRatio||1;t.width=t.clientWidth*m,t.height=t.clientHeight*m;const V=await new O().init(),n=4,a=4,f=n*a,h=t.width/t.height,P=o.perspective(2*Math.PI/5,h,1,100),l=new Array(f);let d=[];const p=4;let x=0;for(let r=0;r<n;r++)for(let e=0;e<a;e++)l[x]=o.translation(u.fromValues(p*(r-n/2+.5),p*(e-a/2+.5),0)),x++;const g=o.translation(u.fromValues(0,0,-12)),i=o.create();function y(){const r=Date.now()/1e3;let e=0;for(let s=0;s<n;s++)for(let c=0;c<a;c++)o.rotate(l[e],u.fromValues(Math.sin((s+.5)*r),Math.cos((c+.5)*r),0),1,i),o.multiply(g,i,i),o.multiply(P,i,i),C(d)[e]=i.slice(),e++}const M={commandEncoders:[{passEncoders:[{descriptor:{colorAttachments:[{view:{texture:{context:{canvasId:t.id}}},clearValue:[.5,.5,.5,1]}],depthStencilAttachment:{depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},renderPassObjects:[{pipeline:{vertex:{code:U},fragment:{code:I},primitive:{cullFace:"back"}},vertices:{position:{data:b,format:"float32x4",offset:j,arrayStride:w},uv:{data:b,format:"float32x2",offset:S,arrayStride:w}},draw:{__type__:"DrawVertex",vertexCount:A,instanceCount:f},bindingResources:{uniforms:{modelViewProjectionMatrix:d}}}]}]}]};function v(){y(),V.submit(M),requestAnimationFrame(v)}requestAnimationFrame(v)},_=document.getElementById("webgpu");W(_);
