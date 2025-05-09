import"../../../modulepreload-polyfill-3cfb730f.js";import{W as J,r as A,g as N}from"../../../Buffer-5212487c.js";import{G as Z}from"../../../dat.gui.module-5ea4ba08.js";import{m as c,v as $}from"../../../wgpu-matrix.module-82499b8f.js";import{c as K,S as P}from"../../../sphere-e20f19ca.js";var Q=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function ee(a){return a&&a.__esModule&&Object.prototype.hasOwnProperty.call(a,"default")?a.default:a}var F={exports:{}};(function(a,R){(function(x,d){a.exports=d()})(Q,function(){var x=function(){var d=0,l=document.createElement("div");function f(o){return l.appendChild(o.dom),o}function p(o){for(var r=0;r<l.children.length;r++)l.children[r].style.display=r===o?"block":"none";d=o}l.style.cssText="position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000",l.addEventListener("click",function(o){o.preventDefault(),p(++d%l.children.length)},!1);var h=(performance||Date).now(),m=h,n=0,w=f(new x.Panel("FPS","#0ff","#002")),S=f(new x.Panel("MS","#0f0","#020"));if(self.performance&&self.performance.memory)var y=f(new x.Panel("MB","#f08","#201"));return p(0),{REVISION:16,dom:l,addPanel:f,showPanel:p,begin:function(){h=(performance||Date).now()},end:function(){n++;var o=(performance||Date).now();if(S.update(o-h,200),m+1e3<=o&&(w.update(1e3*n/(o-m),100),m=o,n=0,y)){var r=performance.memory;y.update(r.usedJSHeapSize/1048576,r.jsHeapSizeLimit/1048576)}return o},update:function(){h=this.end()},domElement:l,setMode:p}};return x.Panel=function(d,l,f){var p=1/0,h=0,m=Math.round,n=m(window.devicePixelRatio||1),w=80*n,S=48*n,y=3*n,o=2*n,r=3*n,g=15*n,s=74*n,v=30*n,b=document.createElement("canvas");b.width=w,b.height=S,b.style.cssText="width:80px;height:48px";var t=b.getContext("2d");return t.font="bold "+9*n+"px Helvetica,Arial,sans-serif",t.textBaseline="top",t.fillStyle=f,t.fillRect(0,0,w,S),t.fillStyle=l,t.fillText(d,y,o),t.fillRect(r,g,s,v),t.fillStyle=f,t.globalAlpha=.9,t.fillRect(r,g,s,v),{dom:b,update:function(M,j){p=Math.min(p,M),h=Math.max(h,M),t.fillStyle=f,t.globalAlpha=1,t.fillRect(0,0,w,g),t.fillStyle=l,t.fillText(m(M)+" "+d+" ("+m(p)+"-"+m(h)+")",y,o),t.drawImage(b,r+n,g,s-n,v,r,g,s-n,v),t.fillRect(r+s-n,g,n,v),t.fillStyle=f,t.globalAlpha=.9,t.fillRect(r+s-n,g,n,m((1-M/j)*v))}}},x})})(F);var te=F.exports;const ne=ee(te),D=`struct Uniforms {
  viewProjectionMatrix: mat4x4<f32>
}
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

@group(1) @binding(0) var<uniform> modelMatrix : mat4x4<f32>;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) uv: vec2<f32>,
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.viewProjectionMatrix * modelMatrix * vec4<f32>(input.position,1.0);
    output.normal = normalize((modelMatrix * vec4(input.normal, 0.0)).xyz);
    output.uv = input.uv;
    return output;
}

@group(1) @binding(1) var meshSampler: sampler;
@group(1) @binding(2) var meshTexture: texture_2d<f32>;

// Static directional lighting
const lightDir = vec3<f32>(1.0, 1.0, 1.0);
const dirColor = vec3(1.0);
const ambientColor = vec3<f32>(0.05);

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let textureColor = textureSample(meshTexture, meshSampler, input.uv);

  // Very simplified lighting algorithm.
    let lightColor = saturate(ambientColor + max(dot(input.normal, lightDir), 0.0) * dirColor);

    return vec4<f32>(textureColor.rgb * lightColor, textureColor.a);
}`,re=async(a,R,x)=>{const d={useRenderBundles:!0,asteroidCount:5e3};R.add(d,"useRenderBundles").onChange(V),R.add(d,"asteroidCount",1e3,1e4,1e3).onChange(()=>{M(),T()});const l=window.devicePixelRatio||1;a.width=a.clientWidth*l,a.height=a.clientHeight*l;const f=await new J().init(),p={canvasId:a.id},h={vertex:{code:D},fragment:{code:D},primitive:{cullFace:"back"}},m={size:[a.width,a.height],format:"depth24plus"},n=4*16,w=new Uint8Array(n);let S;{const e=await fetch(new URL("../../../assets/img/saturn.jpg",self.location).toString()),i=await createImageBitmap(await e.blob());S={size:[i.width,i.height],format:"rgba8unorm",sources:[{image:i}]}}let y;{const e=await fetch(new URL("../../../assets/img/moon.jpg",self.location).toString()),i=await createImageBitmap(await e.blob());y={size:[i.width,i.height],format:"rgba8unorm",sources:[{image:i}]}}const o={magFilter:"linear",minFilter:"linear"};function r(e,i=32,u=16,O=0){const B=K(e,i,u,O),C=B.vertices,X={position:{data:C,format:"float32x3",offset:P.positionsOffset,arrayStride:P.vertexStride},normal:{data:C,format:"float32x3",offset:P.normalOffset,arrayStride:P.vertexStride},uv:{data:C,format:"float32x2",offset:P.uvOffset,arrayStride:P.vertexStride}},Y=B.indices;return{vertexAttributes:X,indices:Y,indexCount:B.indices.length}}function g(e,i){return{modelMatrix:{bufferView:new Float32Array(i)},meshSampler:o,meshTexture:{texture:e}}}const s=c.create();c.identity(s);const v=r(1);v.bindGroup=g(S,s);const b=[r(.01,8,6,.15),r(.013,8,6,.15),r(.017,8,6,.15),r(.02,8,6,.15),r(.03,16,8,.15)],t=[v];function M(){for(let e=t.length;e<=d.asteroidCount;++e){const i=Math.random()*1.7+1.25,u=Math.random()*Math.PI*2,O=Math.sin(u)*i,B=(Math.random()-.5)*.015,C=Math.cos(u)*i;c.identity(s),c.translate(s,[O,B,C],s),c.rotateX(s,Math.random()*Math.PI,s),c.rotateY(s,Math.random()*Math.PI,s),t.push({...b[e%b.length],bindGroup:g(y,s)})}}M();const j={colorAttachments:[{view:{texture:{context:p}},clearValue:[0,0,0,1]}],depthStencilAttachment:{view:{texture:m},depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},L=a.width/a.height,k=c.perspective(2*Math.PI/5,L,1,100),E=c.create(),H={uniforms:{bufferView:w}};function W(){const e=c.identity();c.translate(e,$.fromValues(0,0,-4),e);const i=Date.now()/1e3;return c.rotateZ(e,Math.PI*.1,e),c.rotateX(e,Math.PI*.1,e),c.rotateY(e,i*.05,e),c.multiply(k,e,E),E}function G(){const e=[];let i=0;for(const u of t)if(u.renderObject||(u.renderObject={pipeline:h,bindingResources:{...H,...u.bindGroup},vertices:u.vertexAttributes,indices:u.indices,draw:{__type__:"DrawIndexed",indexCount:u.indexCount}}),e.push(u.renderObject),++i>d.asteroidCount)break;return e}const I={descriptor:j,renderPassObjects:[]},q={commandEncoders:[{passEncoders:[I]}]};let _={__type__:"RenderBundle",renderObjects:G()};function T(){_={__type__:"RenderBundle",renderObjects:G()},V()}T();function V(){d.useRenderBundles?A(I).renderPassObjects=[_]:A(I).renderPassObjects=_.renderObjects}V();function z(){x.begin();const e=W();A(N(w)).writeBuffers=[{data:e}],f.submit(q),x.end(),requestAnimationFrame(z)}requestAnimationFrame(z)},U=new ne;document.body.appendChild(U.dom);const oe=new Z({width:310}),ie=document.getElementById("webgpu");re(ie,oe,U);
