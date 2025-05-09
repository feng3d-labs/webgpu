import"../../../modulepreload-polyfill-3cfb730f.js";import{W as G,r as v}from"../../../Buffer-5212487c.js";import{G as _}from"../../../dat.gui.module-5ea4ba08.js";import{m as c}from"../../../wgpu-matrix.module-82499b8f.js";const L=`struct Vertex {
  @location(0) position: vec4f,
};

struct Uniforms {
  matrix: mat4x4f,
  resolution: vec2f,
  size: f32,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
  let points = array(
    vec2f(-1, -1),
    vec2f( 1, -1),
    vec2f(-1,  1),
    vec2f(-1,  1),
    vec2f( 1, -1),
    vec2f( 1,  1),
  );
  var vsOut: VSOutput;
  let pos = points[vNdx];
  let clipPos = uni.matrix * vert.position;
  let pointPos = vec4f(pos * uni.size / uni.resolution, 0, 0);
  vsOut.position = clipPos + pointPos;
  vsOut.texcoord = pos * 0.5 + 0.5;
  return vsOut;
}
`,U=`struct Vertex {
  @location(0) position: vec4f,
};

struct Uniforms {
  matrix: mat4x4f,
  resolution: vec2f,
  size: f32,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(
    vert: Vertex,
    @builtin(vertex_index) vNdx: u32,
) -> VSOutput {
  let points = array(
    vec2f(-1, -1),
    vec2f( 1, -1),
    vec2f(-1,  1),
    vec2f(-1,  1),
    vec2f( 1, -1),
    vec2f( 1,  1),
  );
  var vsOut: VSOutput;
  let pos = points[vNdx];
  let clipPos = uni.matrix * vert.position;
  let pointPos = vec4f(pos * uni.size / uni.resolution * clipPos.w, 0, 0);
  vsOut.position = clipPos + pointPos;
  vsOut.texcoord = pos * 0.5 + 0.5;
  return vsOut;
}
`,I=`
@fragment fn fs() -> @location(0) vec4f {
  return vec4f(1, 0.5, 0.2, 1);
}
`,N=`struct VSOutput {
  @location(0) texcoord: vec2f,
};

@group(0) @binding(1) var s: sampler;
@group(0) @binding(2) var t: texture_2d<f32>;

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  let color = textureSample(t, s, vsOut.texcoord);
  if (color.a < 0.1) {
    discard;
  }
  return color;
}
`;function q({numSamples:t,radius:e}){const n=[],x=Math.PI*(3-Math.sqrt(5));for(let i=0;i<t;++i){const a=2/t,u=i*a-1+a/2,p=Math.sqrt(1-Math.pow(u,2)),s=i%t*x,m=Math.cos(s)*p,h=Math.sin(s)*p;n.push(m*e,u*e,h*e)}return new Float32Array(n)}const E=async(t,e)=>{const n=window.devicePixelRatio||1;t.width=t.clientWidth*n,t.height=t.clientHeight*n;const x=await new G().init(),i=[I,N],a=[L,U],u="depth24plus",p=a.map(r=>i.map(g=>({vertex:{code:r,buffers:[{arrayStride:3*4,stepMode:"instance",attributes:[{shaderLocation:0,offset:0,format:"float32x3"}]}]},fragment:{code:g,targets:[{blend:{color:{srcFactor:"one",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha"}}}]},depthStencil:{depthWriteEnabled:!0,depthCompare:"less",format:u}}))),s=q({radius:1,numSamples:1e3}),m=s.length/3,h={position:{data:s,format:"float32x3",arrayStride:12,stepMode:"instance"}},o=new OffscreenCanvas(64,64).getContext("2d");o.font="60px sans-serif",o.textAlign="center",o.textBaseline="middle",o.fillText("🦋",32,32);const S={},w={size:[o.canvas.width,o.canvas.height],format:"rgba8unorm",sources:[{image:o.canvas,flipY:!0}]},d={uni:{matrix:void 0,resolution:void 0,size:void 0},s:S,t:{texture:w}},P={label:"our basic canvas renderPass",colorAttachments:[{view:{texture:{context:{canvasId:t.id}}},clearValue:[.3,.3,.3,1],loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:void 0,depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},l={fixedSize:!1,textured:!1,size:10};e.add(l,"fixedSize"),e.add(l,"textured"),e.add(l,"size",0,80);const b={pipeline:void 0,bindingResources:d,vertices:h,draw:{__type__:"DrawVertex",vertexCount:6,instanceCount:m}},V={commandEncoders:[{passEncoders:[{descriptor:P,renderPassObjects:[b]}]}]};function O(r){r*=.001;const{size:g,fixedSize:z,textured:F}=l;v(b).pipeline=p[z?1:0][F?1:0],v(d.uni).size=g;const y=90*Math.PI/180,M=t.clientWidth/t.clientHeight,W=c.perspective(y,M,.1,50),A=c.lookAt([0,0,1.5],[0,0,0],[0,1,0]),C=c.multiply(W,A),f=new Float32Array(16);c.rotateY(C,r,f),c.rotateX(f,r*.1,f),v(d.uni).matrix=f,v(d.uni).resolution=[t.width,t.height],x.submit(V),requestAnimationFrame(O)}requestAnimationFrame(O)},j=new _,D=document.getElementById("webgpu");E(D,j);
