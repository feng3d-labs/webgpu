import"../../../modulepreload-polyfill-3cfb730f.js";import{W as j,r as M}from"../../../Buffer-23ffa079.js";import{m as e,v as c}from"../../../wgpu-matrix.module-82499b8f.js";import{a as g,b as R,d,e as L,c as U}from"../../../cube-9c7624af.js";import{b as O}from"../../../basic.vert-5cd75182.js";const A=`@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_cube<f32>;

@fragment
fn main(
    @location(0) fragUV: vec2<f32>,
    @location(1) fragPosition: vec4<f32>
) -> @location(0) vec4<f32> {
  // Our camera and the skybox cube are both centered at (0, 0, 0)
  // so we can use the cube geomtry position to get viewing vector to sample the cube texture.
  // The magnitude of the vector doesn't matter.
    var cubemapVec = fragPosition.xyz - vec3(0.5);
    return textureSample(myTexture, mySampler, cubemapVec);
}
`,F=async t=>{const m=window.devicePixelRatio||1;t.width=t.clientWidth*m,t.height=t.clientHeight*m;const f=await new j().init();let u;{const V=[new URL("../../../assets/img/cubemap/posx.jpg",self.location).toString(),new URL("../../../assets/img/cubemap/negx.jpg",self.location).toString(),new URL("../../../assets/img/cubemap/posy.jpg",self.location).toString(),new URL("../../../assets/img/cubemap/negy.jpg",self.location).toString(),new URL("../../../assets/img/cubemap/posz.jpg",self.location).toString(),new URL("../../../assets/img/cubemap/negz.jpg",self.location).toString()].map(s=>{const r=document.createElement("img");return r.src=s,r.decode().then(()=>createImageBitmap(r))}),n=await Promise.all(V),P=n.map((s,r)=>({image:s,textureOrigin:[0,0,r]}));u={size:[n[0].width,n[0].height,6],dimension:"cube",format:"rgba8unorm",sources:P}}const b={magFilter:"linear",minFilter:"linear"},x=t.width/t.height,w=e.perspective(2*Math.PI/5,x,1,3e3),h=e.scaling(c.fromValues(1e3,1e3,1e3)),i=e.create(),y=e.identity(),a=e.create();function S(){const o=Date.now()/800;e.rotate(y,c.fromValues(1,0,0),Math.PI/10*Math.sin(o),a),e.rotate(a,c.fromValues(0,1,0),o*.2,a),e.multiply(a,h,i),e.multiply(w,i,i)}const v={colorAttachments:[{view:{texture:{context:{canvasId:t.id}}}}],depthStencilAttachment:{depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},p={pipeline:{vertex:{code:O},fragment:{code:A},primitive:{cullFace:"none"}},bindingResources:{uniforms:{modelViewProjectionMatrix:new Float32Array(16)},mySampler:b,myTexture:{texture:u}},vertices:{position:{data:g,format:"float32x4",offset:R,arrayStride:d},uv:{data:g,format:"float32x2",offset:L,arrayStride:d}},draw:{__type__:"DrawVertex",vertexCount:U}};function l(){S(),M(p.bindingResources.uniforms).modelViewProjectionMatrix=i.subarray();const o={commandEncoders:[{passEncoders:[{descriptor:v,renderPassObjects:[p]}]}]};f.submit(o),requestAnimationFrame(l)}requestAnimationFrame(l)},T=document.getElementById("webgpu");F(T);
