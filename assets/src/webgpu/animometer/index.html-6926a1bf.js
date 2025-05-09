import"../../../modulepreload-polyfill-3cfb730f.js";import{W as Y,r as G}from"../../../Buffer-5212487c.js";import{G as W}from"../../../dat.gui.module-5ea4ba08.js";const M=`struct Time {
  value: f32,
}

struct Uniforms {
  scale: f32,
  offsetX: f32,
  offsetY: f32,
  scalar: f32,
  scalarOffset: f32,
}

@binding(0) @group(0) var<uniform> time : Time;
@binding(0) @group(1) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_color: vec4<f32>,
}

@vertex
fn vert_main(
    @location(0) position: vec4<f32>,
    @location(1) color: vec4<f32>
) -> VertexOutput {
    var fade = (uniforms.scalarOffset + time.value * uniforms.scalar / 10.0) % 1.0;
    if fade < 0.5 {
        fade = fade * 2.0;
    } else {
        fade = (1.0 - fade) * 2.0;
    }
    var xpos = position.x * uniforms.scale;
    var ypos = position.y * uniforms.scale;
    var angle = 3.14159 * 2.0 * fade;
    var xrot = xpos * cos(angle) - ypos * sin(angle);
    var yrot = xpos * sin(angle) + ypos * cos(angle);
    xpos = xrot + uniforms.offsetX;
    ypos = yrot + uniforms.offsetY;

    var output: VertexOutput;
    output.v_color = vec4(fade, 1.0 - fade, 0.0, 1.0) + color;
    output.Position = vec4(xpos, ypos, 0.0, 1.0);
    return output;
}

@fragment
fn frag_main(@location(0) v_color: vec4<f32>) -> @location(0) vec4<f32> {
    return v_color;
}
`,I=async(r,w)=>{const t=document.createElement("div");t.style.color="white",t.style.background="black",t.style.position="absolute",t.style.top="10px",t.style.left="10px";const x=document.createElement("pre");t.appendChild(x),r.parentNode.appendChild(t);const b=new URLSearchParams(window.location.search),a=2e5,u={numTriangles:Number(b.get("numTriangles"))||2e4,renderBundles:!!b.get("renderBundles")},E=window.devicePixelRatio||1;r.width=r.clientWidth*E,r.height=r.clientHeight*E;const R=await new Y().init(),p=4*Float32Array.BYTES_PER_ELEMENT,S={...{vertex:{code:M},fragment:{code:M},primitive:{frontFace:"ccw"}}},T=new Float32Array([0,.1,0,1,1,0,0,1,-.1,-.1,0,1,0,1,0,1,.1,-.1,0,1,0,0,1,1]),D={pipeline:S,bindingResources:{},vertices:{position:{data:T,format:"float32x4",offset:0,arrayStride:2*p},color:{data:T,format:"float32x4",offset:p,arrayStride:2*p}},draw:{__type__:"DrawVertex",vertexCount:3,instanceCount:1}},j=5*Float32Array.BYTES_PER_ELEMENT,m=Math.ceil(j/256)*256,i=m/Float32Array.BYTES_PER_ELEMENT,o=new Float32Array(a*m+Float32Array.BYTES_PER_ELEMENT);for(let e=0;e<a;++e)o[i*e+0]=Math.random()*.2+.2,o[i*e+1]=.9*2*(Math.random()-.5),o[i*e+2]=.9*2*(Math.random()-.5),o[i*e+3]=Math.random()*1.5+.5,o[i*e+4]=Math.random()*10;const C=a*m,_={bufferView:new Float32Array(o.buffer,C,1),value:0},h=[];for(let e=0;e<a;++e)h[e]={...D,bindingResources:{time:_,uniforms:{bufferView:new Float32Array(o.buffer,e*m,5)}}};const F={colorAttachments:[{view:{texture:{context:{canvasId:r.id}}},clearValue:[0,0,0,1]}]};function B(){const e=u.numTriangles,n=h.slice(0,e);let l;const d=new Float32Array([0]),s={__type__:"RenderBundle",renderObjects:n},y=[],U={commandEncoders:[{passEncoders:y}]},V={descriptor:F,renderPassObjects:[s]},N={descriptor:F,renderPassObjects:n};return function(O){l===void 0&&(l=O),d[0]=(O-l)/1e3,G(_).value=d[0],u.renderBundles?y[0]=V:y[0]=N,R.submit(U)}}let A=B();const L=()=>{A=B()};w.add(u,"numTriangles",0,a).step(1).onFinishChange(L),w.add(u,"renderBundles");let v,c,f,g=!0;function P(e){let n=0;v!==void 0&&(n=e-v),v=e;const l=performance.now();A(e);const d=performance.now()-l;f===void 0&&(f=n),c===void 0&&(c=d);const s=.2;f=(1-s)*f+s*n,c=(1-s)*c+s*d,g&&(x.innerHTML=`Avg Javascript: ${c.toFixed(2)} ms
Avg Frame: ${f.toFixed(2)} ms`,g=!1,setTimeout(()=>{g=!0},100)),requestAnimationFrame(P)}requestAnimationFrame(P)},$=new W({width:310}),k=document.getElementById("webgpu");I(k,$);
