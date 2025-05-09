import"../../../modulepreload-polyfill-3cfb730f.js";import{G as le}from"../../../dat.gui.module-5ea4ba08.js";import{v as s,a as ge,m as o}from"../../../wgpu-matrix.module-82499b8f.js";import{m as a}from"../../../stanfordDragon-74213251.js";import{W as de,g as r,r as d}from"../../../Buffer-5212487c.js";import"../../../utils-90ee43e9.js";const me=`@group(0) @binding(0) var gBufferPosition: texture_2d<f32>;
@group(0) @binding(1) var gBufferNormal: texture_2d<f32>;
@group(0) @binding(2) var gBufferAlbedo: texture_2d<f32>;

struct LightData {
  position: vec4<f32>,
  color: vec3<f32>,
  radius: f32,
}
struct LightsBuffer {
  lights: array<LightData>,
}
@group(1) @binding(0) var<storage, read> lightsBuffer: LightsBuffer;

struct Config {
  numLights: u32,
}
@group(1) @binding(1) var<uniform> config: Config;

@fragment
fn main(
    @builtin(position) coord: vec4<f32>
) -> @location(0) vec4<f32> {
    var result: vec3<f32>;

    let position = textureLoad(
        gBufferPosition,
        vec2<i32>(floor(coord.xy)),
        0
    ).xyz;

    if position.z > 10000.0 {
    discard;
    }

    let normal = textureLoad(
        gBufferNormal,
        vec2<i32>(floor(coord.xy)),
        0
    ).xyz;

    let albedo = textureLoad(
        gBufferAlbedo,
        vec2<i32>(floor(coord.xy)),
        0
    ).rgb;

    for (var i = 0u; i < config.numLights; i++) {
        let L = lightsBuffer.lights[i].position.xyz - position;
        let distance = length(L);
        if distance > lightsBuffer.lights[i].radius {
      continue;
        }
        let lambert = max(dot(normal, normalize(L)), 0.0);
        result += vec3<f32>(
            lambert * pow(1.0 - distance / lightsBuffer.lights[i].radius, 2.0) * lightsBuffer.lights[i].color * albedo
        );
    }

  // some manual ambient
    result += vec3(0.2);

    return vec4(result, 1.0);
}
`,pe=`@group(0) @binding(0) var gBufferPosition: texture_2d<f32>;
@group(0) @binding(1) var gBufferNormal: texture_2d<f32>;
@group(0) @binding(2) var gBufferAlbedo: texture_2d<f32>;

override canvasSizeWidth: f32;
override canvasSizeHeight: f32;

@fragment
fn main(
    @builtin(position) coord: vec4<f32>
) -> @location(0) vec4<f32> {
    var result: vec4<f32>;
    let c = coord.xy / vec2<f32>(canvasSizeWidth, canvasSizeHeight);
    if c.x < 0.33333 {
        result = textureLoad(
            gBufferPosition,
            vec2<i32>(floor(coord.xy)),
            0
        );
    } else if c.x < 0.66667 {
        result = textureLoad(
            gBufferNormal,
            vec2<i32>(floor(coord.xy)),
            0
        );
        result.x = (result.x + 1.0) * 0.5;
        result.y = (result.y + 1.0) * 0.5;
        result.z = (result.z + 1.0) * 0.5;
    } else {
        result = textureLoad(
            gBufferAlbedo,
            vec2<i32>(floor(coord.xy)),
            0
        );
    }
    return result;
}
`,he=`struct GBufferOutput {
  @location(0) position: vec4<f32>,
  @location(1) normal: vec4<f32>,

  // Textures: diffuse color, specular color, smoothness, emissive etc. could go here
  @location(2) albedo: vec4<f32>,
}

@fragment
fn main(
    @location(0) fragPosition: vec3<f32>,
    @location(1) fragNormal: vec3<f32>,
    @location(2) fragUV: vec2<f32>
) -> GBufferOutput {
  // faking some kind of checkerboard texture
    let uv = floor(30.0 * fragUV);
    let c = 0.2 + 0.5 * ((uv.x + uv.y) - 2.0 * floor((uv.x + uv.y) / 2.0));

    var output: GBufferOutput;
    output.position = vec4(fragPosition, 1.0);
    output.normal = vec4(fragNormal, 1.0);
    output.albedo = vec4(c, c, c, 1.0);

    return output;
}
`,xe=`struct LightData {
  position: vec4<f32>,
  color: vec3<f32>,
  radius: f32,
}
struct LightsBuffer {
  lights: array<LightData>,
}
@group(0) @binding(0) var<storage, read_write> lightsBuffer: LightsBuffer;

struct Config {
  numLights: u32,
}
@group(0) @binding(1) var<uniform> config: Config;

struct LightExtent {
  min: vec4<f32>,
  max: vec4<f32>,
}
@group(0) @binding(2) var<uniform> lightExtent: LightExtent;

@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    var index = GlobalInvocationID.x;
    if index >= config.numLights {
        return;
    }

    lightsBuffer.lights[index].position.y = lightsBuffer.lights[index].position.y - 0.5 - 0.003 * (f32(index) - 64.0 * floor(f32(index) / 64.0));

    if lightsBuffer.lights[index].position.y < lightExtent.min.y {
        lightsBuffer.lights[index].position.y = lightExtent.max.y;
    }
}
`,k=`@vertex
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

    return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
}
`,ve=`struct Uniforms {
  modelMatrix: mat4x4<f32>,
  normalModelMatrix: mat4x4<f32>,
}
struct Camera {
  viewProjectionMatrix: mat4x4<f32>,
}
@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<uniform> camera : Camera;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragPosition: vec3<f32>,  // position in world space
  @location(1) fragNormal: vec3<f32>,    // normal in world space
  @location(2) fragUV: vec2<f32>,
}

@vertex
fn main(
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>
) -> VertexOutput {
    var output: VertexOutput;
    output.fragPosition = (uniforms.modelMatrix * vec4(position, 1.0)).xyz;
    output.Position = camera.viewProjectionMatrix * vec4(output.fragPosition, 1.0);
    output.fragNormal = normalize((uniforms.normalModelMatrix * vec4(normal, 1.0)).xyz);
    output.fragUV = uv;
    return output;
}
`,v=1024,V=s.fromValues(-50,-30,-50),j=s.fromValues(50,50,50),Be=async(t,_)=>{const L=window.devicePixelRatio||1;t.width=t.clientWidth*L,t.height=t.clientHeight*L;const W=t.width/t.height,Y=await new de().init(),h=8,c=new Float32Array(a.positions.length*h);for(let e=0;e<a.positions.length;++e)c.set(a.positions[e],h*e),c.set(a.normals[e],h*e+3),c.set(a.uvs[e],h*e+6);const H={position:{data:c,format:"float32x3",offset:0,arrayStride:Float32Array.BYTES_PER_ELEMENT*8},normal:{data:c,format:"float32x3",offset:Float32Array.BYTES_PER_ELEMENT*3,arrayStride:Float32Array.BYTES_PER_ELEMENT*8},uv:{data:c,format:"float32x2",offset:Float32Array.BYTES_PER_ELEMENT*6,arrayStride:Float32Array.BYTES_PER_ELEMENT*8}},M=a.triangles.length*3,A=new Uint16Array(M);for(let e=0;e<a.triangles.length;++e)A.set(a.triangles[e],3*e);const X={size:[t.width,t.height],format:"rgba32float"},q={size:[t.width,t.height],format:"rgba16float"},Q={size:[t.width,t.height],format:"bgra8unorm"},l=[{texture:X},{texture:q},{texture:Q}],B={topology:"triangle-list",cullMode:"back"},$={vertex:{code:ve},fragment:{code:he},primitive:B},J={vertex:{code:k},fragment:{code:pe,constants:{canvasSizeWidth:t.width,canvasSizeHeight:t.height}},primitive:B},K={vertex:{code:k},fragment:{code:me},primitive:B},Z={size:[t.width,t.height],format:"depth24plus"},ee={colorAttachments:[{view:l[0],clearValue:[Number.MAX_VALUE,Number.MAX_VALUE,Number.MAX_VALUE,1]},{view:l[1],clearValue:[0,0,1,1]},{view:l[2],clearValue:[0,0,0,1]}],depthStencilAttachment:{view:{texture:Z},depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},U={colorAttachments:[{view:{texture:{context:{canvasId:t.id}}},clearValue:[0,0,0,1]}]},g={mode:"rendering",numLights:128},m=new Uint32Array([g.numLights]);_.add(g,"mode",["rendering","gBuffers view"]),_.add(g,"numLights",1,v).step(1).onChange(()=>{r(m).writeBuffers?r(m).writeBuffers.push({data:new Uint32Array([g.numLights])}):d(r(m)).writeBuffers=[{data:new Uint32Array([g.numLights])}]});const f=new Uint8Array(4*16*2),u=new Uint8Array(4*16),te={uniforms:{bufferView:f},camera:{bufferView:u}},D={gBufferPosition:l[0],gBufferNormal:l[1],gBufferAlbedo:l[2]},re=s.sub(j,V),z=8,x=new Float32Array(z*v),n=ge.create();let w=0;for(let e=0;e<v;e++){w=z*e;for(let i=0;i<3;i++)n[i]=Math.random()*re[i]+V[i];n[3]=1,x.set(n,w),n[0]=Math.random()*2,n[1]=Math.random()*2,n[2]=Math.random()*2,n[3]=20,x.set(n,w+4)}const T=new Uint8Array(4*8),b=new Float32Array(8);b.set(V,0),b.set(j,4),d(r(T)).writeBuffers=[{data:b}];const oe={compute:{code:xe}},ie={lightsBuffer:{bufferView:x},config:{bufferView:m}},ne={lightsBuffer:{bufferView:x},config:{bufferView:m},lightExtent:{bufferView:T}},ae=s.fromValues(0,50,-100),G=s.fromValues(0,1,0),y=s.fromValues(0,0,0),N=o.perspective(2*Math.PI/5,W,1,2e3),se=o.lookAt(ae,y,G),E=o.multiply(N,se),S=o.translation([0,-45,0]),C=E;r(u).writeBuffers?r(u).writeBuffers.push({data:C}):d(r(u)).writeBuffers=[{data:C}];const O=S;r(f).writeBuffers?r(f).writeBuffers.push({data:O}):d(r(f)).writeBuffers=[{data:O}];const P=o.invert(S);o.transpose(P,P);const R=P;r(f).writeBuffers?r(f).writeBuffers.push({bufferOffset:64,data:R}):d(r(f)).writeBuffers=[{bufferOffset:64,data:R}];function fe(){const e=s.fromValues(0,50,-100),i=Math.PI*(Date.now()/5e3),ue=o.rotateY(o.translation(y),i);s.transformMat4(e,ue,e);const ce=o.lookAt(e,y,G);return o.multiply(N,ce,E),E}const p=[];p.push({descriptor:ee,renderPassObjects:[{pipeline:$,bindingResources:{...te},vertices:H,indices:A,draw:{__type__:"DrawIndexed",indexCount:M}}]}),p.push({__type__:"ComputePass",computeObjects:[{pipeline:oe,bindingResources:{...ne},workgroups:{workgroupCountX:Math.ceil(v/64)}}]});const F=p.concat();F.push({descriptor:U,renderPassObjects:[{pipeline:J,bindingResources:{...D},draw:{__type__:"DrawVertex",vertexCount:6}}]}),p.push({descriptor:U,renderPassObjects:[{pipeline:K,bindingResources:{...D,...ie},draw:{__type__:"DrawVertex",vertexCount:6}}]});function I(){const e=fe();r(u).writeBuffers?r(u).writeBuffers.push({data:e}):d(r(u)).writeBuffers=[{data:e}];const i={commandEncoders:[{passEncoders:g.mode==="gBuffers view"?F:p}]};Y.submit(i),requestAnimationFrame(I)}requestAnimationFrame(I)},we=new le({width:310}),be=document.getElementById("webgpu");Be(be,we);
