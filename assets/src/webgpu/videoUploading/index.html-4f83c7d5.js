import"../../../modulepreload-polyfill-3cfb730f.js";import{W as m}from"../../../Buffer-5212487c.js";import{f as c}from"../../../fullscreenTexturedQuad-007c8036.js";const d=`@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_external;

@fragment
fn main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSampleBaseClampToEdge(myTexture, mySampler, fragUV);
}
`,u=async t=>{const e=document.createElement("video");e.loop=!0,e.autoplay=!0,e.muted=!0,e.src=new URL("../../../assets/video/pano.webm",self.location).toString(),await e.play();const a=window.devicePixelRatio||1;t.width=t.clientWidth*a,t.height=t.clientHeight*a;const i=await new m().init(),n={magFilter:"linear",minFilter:"linear"},o={colorAttachments:[{view:{texture:{context:{canvasId:t.id}}},clearValue:[0,0,0,1]}]},s={pipeline:{vertex:{code:c},fragment:{code:d}},bindingResources:{mySampler:n,myTexture:{source:e}},draw:{__type__:"DrawVertex",vertexCount:6}};function r(){const l={commandEncoders:[{passEncoders:[{descriptor:o,renderPassObjects:[s]}]}]};i.submit(l),"requestVideoFrameCallback"in e?e.requestVideoFrameCallback(r):requestAnimationFrame(r)}"requestVideoFrameCallback"in e?e.requestVideoFrameCallback(r):requestAnimationFrame(r)},p=document.getElementById("webgpu");u(p);
