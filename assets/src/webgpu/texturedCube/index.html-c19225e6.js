import"../../../modulepreload-polyfill-3cfb730f.js";import{W as V,r as v}from"../../../Buffer-5212487c.js";import{m as r,v as d}from"../../../wgpu-matrix.module-82499b8f.js";import{a as l,b as P,d as u,e as S,c as M}from"../../../cube-9c7624af.js";import{b as j}from"../../../basic.vert-5cd75182.js";const A=`@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;

@fragment
fn main(
    @location(0) fragUV: vec2<f32>,
    @location(1) fragPosition: vec4<f32>
) -> @location(0) vec4<f32> {
    return textureSample(myTexture, mySampler, fragUV) * fragPosition;
}
`,F=async e=>{const n=window.devicePixelRatio||1;e.width=e.clientWidth*n,e.height=e.clientHeight*n;const p=await new V().init(),i=document.createElement("img");i.src=new URL("../../../assets/img/Di-3d.png",self.location).toString(),await i.decode();const o=await createImageBitmap(i),f={size:[o.width,o.height],format:"rgba8unorm",sources:[{image:o}]},g={magFilter:"linear",minFilter:"linear"},x={colorAttachments:[{view:{texture:{context:{canvasId:e.id}}},clearValue:[.5,.5,.5,1]}],depthStencilAttachment:{depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},s={modelViewProjectionMatrix:new Float32Array(16)},w={pipeline:{vertex:{code:j},fragment:{code:A},primitive:{cullFace:"back"}},bindingResources:{uniforms:s,mySampler:g,myTexture:{texture:f}},vertices:{position:{data:l,format:"float32x4",offset:P,arrayStride:u},uv:{data:l,format:"float32x2",offset:S,arrayStride:u}},draw:{__type__:"DrawVertex",vertexCount:M}},b=e.width/e.height,h=r.perspective(2*Math.PI/5,b,1,100),c=r.create();function y(){const t=r.identity();r.translate(t,d.fromValues(0,0,-4),t);const a=Date.now()/1e3;return r.rotate(t,d.fromValues(Math.sin(a),Math.cos(a),0),1,t),r.multiply(h,t,c),c}function m(){const t=y();v(s).modelViewProjectionMatrix=t.subarray();const a={commandEncoders:[{passEncoders:[{descriptor:x,renderPassObjects:[w]}]}]};p.submit(a),requestAnimationFrame(m)}requestAnimationFrame(m)},O=document.getElementById("webgpu");F(O);
