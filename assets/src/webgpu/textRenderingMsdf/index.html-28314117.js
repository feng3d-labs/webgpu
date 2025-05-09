import"../../../modulepreload-polyfill-3cfb730f.js";import{m as n,v as G}from"../../../wgpu-matrix.module-82499b8f.js";import{g as B,r as U,W as R}from"../../../Buffer-5212487c.js";import{b as _}from"../../../basic.vert-5cd75182.js";import{v as j}from"../../../vertexPositionColor.frag-aa0bc14e.js";import{c as k,a as S,b as E,d as F,e as z}from"../../../cube-9c7624af.js";const O=`// Positions for simple quad geometry
const pos = array(vec2f(0, -1), vec2f(1, -1), vec2f(0, 0), vec2f(1, 0));

struct VertexInput {
  @builtin(vertex_index) vertex : u32,
  @builtin(instance_index) instance : u32,
};

struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0) texcoord : vec2f,
};

struct Char {
  texOffset: vec2f,
  texExtent: vec2f,
  size: vec2f,
  offset: vec2f,
};

struct FormattedText {
  transform: mat4x4f,
  color: vec4f,
  scale: f32,
  chars: array<vec3f>,
};

struct Camera {
  projection: mat4x4f,
  view: mat4x4f,
};

// Font bindings
@group(0) @binding(0) var fontTexture: texture_2d<f32>;
@group(0) @binding(1) var fontSampler: sampler;
@group(0) @binding(2) var<storage> chars: array<Char>;

// Text bindings
@group(1) @binding(0) var<uniform> camera: Camera;
@group(1) @binding(1) var<storage> text: FormattedText;

@vertex
fn vertexMain(input : VertexInput) -> VertexOutput {
  let textElement = text.chars[input.instance];
  let char = chars[u32(textElement.z)];
  let charPos = (pos[input.vertex] * char.size + textElement.xy + char.offset) * text.scale;

  var output : VertexOutput;
  output.position = camera.projection * camera.view * text.transform * vec4f(charPos, 0, 1);

  output.texcoord = pos[input.vertex] * vec2f(1, -1);
  output.texcoord *= char.texExtent;
  output.texcoord += char.texOffset;
  return output;
}

fn sampleMsdf(texcoord: vec2f) -> f32 {
  let c = textureSample(fontTexture, fontSampler, texcoord);
  return max(min(c.r, c.g), min(max(c.r, c.g), c.b));
}

// Antialiasing technique from Paul Houx 
// https://github.com/Chlumsky/msdfgen/issues/22#issuecomment-234958005
@fragment
fn fragmentMain(input : VertexOutput) -> @location(0) vec4f {
  // pxRange (AKA distanceRange) comes from the msdfgen tool. Don McCurdy's tool
  // uses the default which is 4.
  let pxRange = 4.0;
  let sz = vec2f(textureDimensions(fontTexture, 0));
  let dx = sz.x*length(vec2f(dpdxFine(input.texcoord.x), dpdyFine(input.texcoord.x)));
  let dy = sz.y*length(vec2f(dpdxFine(input.texcoord.y), dpdyFine(input.texcoord.y)));
  let toPixels = pxRange * inverseSqrt(dx * dx + dy * dy);
  let sigDist = sampleMsdf(input.texcoord) - 0.5;
  let pxDist = sigDist * toPixels;

  let edgeWidth = 0.5;

  let alpha = smoothstep(-edgeWidth, edgeWidth, pxDist);

  if (alpha < 0.001) {
    discard;
  }

  return vec4f(text.color.rgb, text.color.a * alpha);
}`;class L{constructor(t,s,r,e,i){this.material=t,this.bindGroup=s,this.lineHeight=r,this.chars=e,this.kernings=i;const a=Object.values(e);this.charCount=a.length,this.defaultChar=a[0]}getChar(t){let s=this.chars[t];return s||(s=this.defaultChar),s}getXAdvance(t,s=-1){const r=this.getChar(t);if(s>=0){const e=this.kernings.get(t);if(e)return r.xadvance+(e.get(s)??0)}return r.xadvance}}class H{constructor(t,s,r,e){this.renderBundle=t,this.measurements=s,this.font=r,this.textBuffer=e,this.bufferArray=new Float32Array(24),this.bufferArrayDirty=!0,n.identity(this.bufferArray),this.setColor(1,1,1,1),this.setPixelScale(1/512),this.bufferArrayDirty=!0}getRenderBundle(){if(this.bufferArrayDirty){this.bufferArrayDirty=!1;const t=B(this.textBuffer),s=t.writeBuffers||[];s.push({bufferOffset:0,data:this.bufferArray,dataOffset:0,size:this.bufferArray.length}),U(t).writeBuffers=s}return this.renderBundle}setTransform(t){n.copy(t,this.bufferArray),this.bufferArrayDirty=!0}setColor(t,s,r,e=1){this.bufferArray[16]=t,this.bufferArray[17]=s,this.bufferArray[18]=r,this.bufferArray[19]=e,this.bufferArrayDirty=!0}setPixelScale(t){this.bufferArray[20]=t,this.bufferArrayDirty=!0}}class X{constructor(){this.cameraUniformBuffer=new Float32Array(16*2),this.sampler={label:"MSDF text sampler",minFilter:"linear",magFilter:"linear",mipmapFilter:"linear",maxAnisotropy:16},this.pipelinePromise={label:"msdf text pipeline",vertex:{code:O,entryPoint:"vertexMain"},fragment:{code:O,entryPoint:"fragmentMain",targets:[{blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"one",dstFactor:"one"}}}]},primitive:{topology:"triangle-strip"},depthStencil:{depthWriteEnabled:!1,depthCompare:"less"}}}async loadTexture(t){const s=await fetch(t),r=await createImageBitmap(await s.blob());return{size:[r.width,r.height],label:`MSDF font texture ${t}`,format:"rgba8unorm",sources:[{image:r}]}}async createFont(t){const r=await(await fetch(t)).json(),e=t.lastIndexOf("/"),i=e!==-1?t.substring(0,e+1):void 0,a=[];for(const g of r.pages)a.push(this.loadTexture(i+g));const b=r.chars.length,u=new Float32Array(b*8),x=1/r.common.scaleW,m=1/r.common.scaleH,h={};let c=0;for(const[g,f]of r.chars.entries())h[f.id]=f,h[f.id].charIndex=g,u[c]=f.x*x,u[c+1]=f.y*m,u[c+2]=f.width*x,u[c+3]=f.height*m,u[c+4]=f.width,u[c+5]=f.height,u[c+6]=f.xoffset,u[c+7]=-f.yoffset,c+=8;const v={fontTexture:{texture:(await Promise.all(a))[0]},fontSampler:this.sampler,chars:{bufferView:u}},P=new Map;if(r.kernings)for(const g of r.kernings){let f=P.get(g.first);f||(f=new Map,P.set(g.first,f)),f.set(g.second,g.amount)}return new L(this.pipelinePromise,v,r.common.lineHeight,h,P)}formatText(t,s,r={}){const e=new Float32Array((s.length+6)*4);let i=24,a;r.centered?(a=this.measureText(t,s),this.measureText(t,s,(m,h,c,w)=>{const v=a.width*-.5-(a.width-a.lineWidths[c])*-.5;e[i]=m+v,e[i+1]=h+a.height*.5,e[i+2]=w.charIndex,i+=4})):a=this.measureText(t,s,(m,h,c,w)=>{e[i]=m,e[i+1]=h,e[i+2]=w.charIndex,i+=4});const b={camera:{bufferView:this.cameraUniformBuffer},text:{bufferView:e}},u={__type__:"RenderBundle",renderObjects:[{pipeline:t.material,bindingResources:{...t.bindGroup,...b},draw:{__type__:"DrawVertex",vertexCount:4,instanceCount:a.printedCharCount}}]},x=new H(u,a,t,e);return r.pixelScale!==void 0&&x.setPixelScale(r.pixelScale),r.color!==void 0&&x.setColor(...r.color),x}measureText(t,s,r){let e=0;const i=[];let a=0,b=0,u=0,x=0,m=s.charCodeAt(0);for(let h=0;h<s.length;++h){const c=m;switch(m=h<s.length-1?s.charCodeAt(h+1):-1,c){case 10:i.push(a),u++,e=Math.max(e,a),a=0,b-=t.lineHeight;case 13:break;case 32:a+=t.getXAdvance(c);break;default:r&&r(a,b,u,t.getChar(c)),a+=t.getXAdvance(c,m),x++}}return i.push(a),e=Math.max(e,a),{width:e,height:i.length*t.lineHeight,lineWidths:i,printedCharCount:x}}updateCamera(t,s){this.cameraUniformBuffer.set(t,0),this.cameraUniformBuffer.set(s,16);const r=B(this.cameraUniformBuffer),e=r.writeBuffers||[];e.push({data:this.cameraUniformBuffer}),U(r).writeBuffers=e}render(t,...s){s.map(e=>e.getRenderBundle()).forEach(e=>{t.push(e)})}}const q=async p=>{const t=window.devicePixelRatio||1;p.width=p.clientWidth*t,p.height=p.clientHeight*t;const s=await new R().init(),r="depth24plus",e=new X,i=await e.createFont(new URL("../../../assets/font/ya-hei-ascii-msdf.json",self.location).toString());function a(y,d){const o=n.create();return n.identity(o),n.translate(o,y,o),d&&d[0]!=0&&n.rotateX(o,d[0],o),d&&d[1]!=0&&n.rotateY(o,d[1],o),d&&d[2]!=0&&n.rotateZ(o,d[2],o),o}const b=[a([0,0,1.1]),a([0,0,-1.1],[0,Math.PI,0]),a([1.1,0,0],[0,Math.PI/2,0]),a([-1.1,0,0],[0,-Math.PI/2,0]),a([0,1.1,0],[-Math.PI/2,0,0]),a([0,-1.1,0],[Math.PI/2,0,0])],u=e.formatText(i,"WebGPU",{centered:!0,pixelScale:1/128}),x=e.formatText(i,`
WebGPU exposes an API for performing operations, such as rendering
and computation, on a Graphics Processing Unit.

Graphics Processing Units, or GPUs for short, have been essential
in enabling rich rendering and computational applications in personal
computing. WebGPU is an API that exposes the capabilities of GPU
hardware for the Web. The API is designed from the ground up to
efficiently map to (post-2014) native GPU APIs. WebGPU is not related
to WebGL and does not explicitly target OpenGL ES.

WebGPU sees physical GPU hardware as GPUAdapters. It provides a
connection to an adapter via GPUDevice, which manages resources, and
the device's GPUQueues, which execute commands. GPUDevice may have
its own memory with high-speed access to the processing units.
GPUBuffer and GPUTexture are the physical resources backed by GPU
memory. GPUCommandBuffer and GPURenderBundle are containers for
user-recorded commands. GPUShaderModule contains shader code. The
other resources, such as GPUSampler or GPUBindGroup, configure the
way physical resources are used by the GPU.

GPUs execute commands encoded in GPUCommandBuffers by feeding data
through a pipeline, which is a mix of fixed-function and programmable
stages. Programmable stages execute shaders, which are special
programs designed to run on GPU hardware. Most of the state of a
pipeline is defined by a GPURenderPipeline or a GPUComputePipeline
object. The state not included in these pipeline objects is set
during encoding with commands, such as beginRenderPass() or
setBlendConstant().`,{pixelScale:1/256}),m=[e.formatText(i,"Front",{centered:!0,pixelScale:1/128,color:[1,0,0,1]}),e.formatText(i,"Back",{centered:!0,pixelScale:1/128,color:[0,1,1,1]}),e.formatText(i,"Right",{centered:!0,pixelScale:1/128,color:[0,1,0,1]}),e.formatText(i,"Left",{centered:!0,pixelScale:1/128,color:[1,0,1,1]}),e.formatText(i,"Top",{centered:!0,pixelScale:1/128,color:[0,0,1,1]}),e.formatText(i,"Bottom",{centered:!0,pixelScale:1/128,color:[1,1,0,1]}),u,x],h={position:{data:S,format:"float32x4",offset:E,arrayStride:F},uv:{data:S,format:"float32x2",offset:z,arrayStride:F}},c={vertex:{code:_},fragment:{code:j},primitive:{cullFace:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less"}},w={size:[p.width,p.height],format:r},v=new Float32Array(16),P={uniforms:{bufferView:v}},g={colorAttachments:[{view:{texture:{context:{canvasId:p.id}}},clearValue:[0,0,0,1],loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:{texture:w},depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},f=p.width/p.height,C=n.perspective(2*Math.PI/5,f,1,100),T=n.create(),D=Date.now();function V(){const y=Date.now()/5e3,d=n.identity();n.translate(d,G.fromValues(0,0,-5),d);const o=n.identity();n.translate(o,G.fromValues(0,2,-3),o),n.rotate(o,G.fromValues(Math.sin(y),Math.cos(y),0),1,o),n.multiply(C,d,T),n.multiply(T,o,T),e.updateCamera(C,d);const l=n.create();for(const[W,I]of b.entries())n.multiply(o,I,l),m[W].setTransform(l);const A=(Date.now()-D)/2500%14;return n.identity(l),n.rotateX(l,-Math.PI/8,l),n.translate(l,[0,A-3,0],l),u.setTransform(l),n.translate(l,[-3,-.1,0],l),x.setTransform(l),T}function M(){const y=V(),d=B(v),o=d.writeBuffers||[];o.push({data:y.buffer,dataOffset:y.byteOffset,size:y.byteLength}),U(d).writeBuffers=o;const l=[];l.push({pipeline:c,bindingResources:P,vertices:h,draw:{__type__:"DrawVertex",vertexCount:k,instanceCount:1}}),e.render(l,...m);const A={commandEncoders:[{passEncoders:[{descriptor:g,renderPassObjects:l}]}]};s.submit(A),requestAnimationFrame(M)}requestAnimationFrame(M)},K=document.getElementById("webgpu");q(K);
