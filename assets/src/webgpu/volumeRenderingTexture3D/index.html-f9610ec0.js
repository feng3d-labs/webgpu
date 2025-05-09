import"../../../modulepreload-polyfill-3cfb730f.js";import{W as z,r as A}from"../../../Buffer-5212487c.js";import{G as C}from"../../../dat.gui.module-5ea4ba08.js";import{m as o}from"../../../wgpu-matrix.module-82499b8f.js";const x=`struct Uniforms {
  inverseModelViewProjectionMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_3d<f32>;

struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) near: vec3f,
  @location(1) step: vec3f,
}

const NumSteps = 64u;

@vertex
fn vertex_main(
    @builtin(vertex_index) VertexIndex: u32
) -> VertexOutput {
    var pos = array<vec2f, 3>(
        vec2(-1.0, 3.0),
        vec2(-1.0, -1.0),
        vec2(3.0, -1.0)
    );
    var xy = pos[VertexIndex];
    var near = uniforms.inverseModelViewProjectionMatrix * vec4f(xy, 0.0, 1);
    var far = uniforms.inverseModelViewProjectionMatrix * vec4f(xy, 1, 1);
    near /= near.w;
    far /= far.w;
    return VertexOutput(
        vec4f(xy, 0.0, 1.0),
        near.xyz,
        (far.xyz - near.xyz) / f32(NumSteps)
    );
}

@fragment
fn fragment_main(
    @location(0) near: vec3f,
    @location(1) step: vec3f
) -> @location(0) vec4f {
    var rayPos = near;
    var result = 0.0;
    for (var i = 0u; i < NumSteps; i++) {
        let texCoord = (rayPos.xyz + 1.0) * 0.5;
        let sample = textureSample(myTexture, mySampler, texCoord).r * 4.0 / f32(NumSteps);
        let intersects = all(rayPos.xyz < vec3f(1.0)) && all(rayPos.xyz > vec3f(-1.0));
        result += select(0.0, (1.0 - result) * sample, intersects && result < 1.0);
        rayPos += step;
    }
    return vec4f(vec3f(result), 1.0);
}
`,c=new C,F=async t=>{const m=window.devicePixelRatio||1;t.width=t.clientWidth*m,t.height=t.clientHeight*m;const v=await new z().init(),r={rotateCamera:!0,near:2,far:7};c.add(r,"rotateCamera",!0),c.add(r,"near",2,7),c.add(r,"far",2,7);const y=4,w={vertex:{code:x},fragment:{code:x},primitive:{topology:"triangle-list",cullFace:"back"}},u={inverseModelViewProjectionMatrix:new Float32Array(16)};let l;{const s="r8unorm",_=await(await fetch("../../../assets/img/volume/t1_icbm_normal_1mm_pn0_rf0_180x216x180_uint8_1x1.bin-gz")).arrayBuffer(),b=new DecompressionStream("gzip"),V=new Response(_).body.pipeThrough(b),S=await new Response(V).arrayBuffer(),j=new Uint8Array(S);l={dimension:"3d",size:[180,216,180],format:s,sources:[{__type__:"TextureDataSource",data:j,dataLayout:{width:180,height:216},size:[180,216,180]}]}}const h={uniforms:u,mySampler:{magFilter:"linear",minFilter:"linear",mipmapFilter:"linear",maxAnisotropy:16},myTexture:{texture:l}},g={colorAttachments:[{view:{texture:{context:{canvasId:t.id}}},clearValue:[.5,.5,.5,1],loadOp:"clear",storeOp:"discard"}],sampleCount:y};let a=0;function P(i){const e=o.identity();o.translate(e,[0,0,-4],e),r.rotateCamera&&(a+=i),o.rotate(e,[Math.sin(a),Math.cos(a),0],1,e);const n=t.width/t.height,s=o.perspective(2*Math.PI/5,n,r.near,r.far),f=o.multiply(s,e);return o.invert(f)}let p=Date.now();const M={commandEncoders:[{passEncoders:[{descriptor:g,renderPassObjects:[{pipeline:w,bindingResources:h,draw:{__type__:"DrawVertex",vertexCount:3}}]}]}]};function d(){const i=Date.now(),e=(i-p)/1e3;p=i;const n=P(e);A(u).inverseModelViewProjectionMatrix=n,v.submit(M),requestAnimationFrame(d)}requestAnimationFrame(d)},B=document.getElementById("webgpu");F(B);
