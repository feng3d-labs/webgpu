import"../../../modulepreload-polyfill-3cfb730f.js";import{W as P,r as T}from"../../../Buffer-23ffa079.js";import{m as r,v as u}from"../../../wgpu-matrix.module-82499b8f.js";import{a as l,b as V,d,e as v,c as S}from"../../../cube-9c7624af.js";import{b as C}from"../../../basic.vert-5cd75182.js";const M=`@binding(1) @group(0) var mySampler: sampler;
@binding(2) @group(0) var myTexture: texture_2d<f32>;

@fragment
fn main(
    @location(0) fragUV: vec2<f32>,
    @location(1) fragPosition: vec4<f32>
) -> @location(0) vec4<f32> {
    let texColor = textureSample(myTexture, mySampler, fragUV * 0.8 + vec2(0.1));
    let f = select(1.0, 0.0, length(texColor.rgb - vec3(0.5)) < 0.01);
    return f * texColor + (1.0 - f) * fragPosition;
}
`,_=async e=>{const i=window.devicePixelRatio||1;e.width=e.clientWidth*i,e.height=e.clientHeight*i;const f=navigator.gpu.getPreferredCanvasFormat(),p=await new P().init(),a={size:[e.width,e.height],format:f},x={magFilter:"linear",minFilter:"linear"},g=e.width/e.height,h=r.perspective(2*Math.PI/5,g,1,100),n=r.create();function b(){const t=r.identity();r.translate(t,u.fromValues(0,0,-4),t);const o=Date.now()/1e3;return r.rotate(t,u.fromValues(Math.sin(o),Math.cos(o),0),1,t),r.multiply(h,t,n),n}const s={canvasId:e.id,configuration:{usage:GPUTextureUsage.COPY_SRC|GPUTextureUsage.RENDER_ATTACHMENT}},w={colorAttachments:[{view:{texture:{context:s}},clearValue:[.5,.5,.5,1]}],depthStencilAttachment:{depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},c={pipeline:{vertex:{code:C},fragment:{code:M},primitive:{cullFace:"back"}},vertices:{position:{data:l,format:"float32x4",offset:V,arrayStride:d},uv:{data:l,format:"float32x2",offset:v,arrayStride:d}},draw:{__type__:"DrawVertex",vertexCount:S},bindingResources:{uniforms:{modelViewProjectionMatrix:new Float32Array(16)},mySampler:x,myTexture:{texture:a}}},y={__type__:"CopyTextureToTexture",source:{texture:{context:s}},destination:{texture:a},copySize:[e.width,e.height]};function m(){const t=b();T(c.bindingResources.uniforms).modelViewProjectionMatrix=t.subarray();const o={commandEncoders:[{passEncoders:[{descriptor:w,renderPassObjects:[c]},y]}]};p.submit(o),requestAnimationFrame(m)}requestAnimationFrame(m)},A=document.getElementById("webgpu");_(A);
