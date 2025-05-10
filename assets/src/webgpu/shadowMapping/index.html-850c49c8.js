import"../../../modulepreload-polyfill-3cfb730f.js";import{W as N,r as g,g as f}from"../../../Buffer-23ffa079.js";import{v as a,m as e}from"../../../wgpu-matrix.module-82499b8f.js";import{m as i}from"../../../stanfordDragon-74213251.js";import"../../../utils-90ee43e9.js";const U=`override shadowDepthTextureSize: f32 = 1024.0;

struct Scene {
  lightViewProjMatrix: mat4x4<f32>,
  cameraViewProjMatrix: mat4x4<f32>,
  lightPos: vec3<f32>,
}

@group(0) @binding(0) var<uniform> scene : Scene;
@group(0) @binding(1) var shadowMap: texture_depth_2d;
@group(0) @binding(2) var shadowSampler: sampler_comparison;

struct FragmentInput {
  @location(0) shadowPos: vec3<f32>,
  @location(1) fragPos: vec3<f32>,
  @location(2) fragNorm: vec3<f32>,
}

const albedo = vec3<f32>(0.9);
const ambientFactor = 0.2;

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  // Percentage-closer filtering. Sample texels in the region
  // to smooth the result.
    var visibility = 0.0;
    let oneOverShadowDepthTextureSize = 1.0 / shadowDepthTextureSize;
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let offset = vec2<f32>(vec2(x, y)) * oneOverShadowDepthTextureSize;

            visibility += textureSampleCompare(
                shadowMap,
                shadowSampler,
                input.shadowPos.xy + offset,
                input.shadowPos.z - 0.007
            );
        }
    }
    visibility /= 9.0;

    let lambertFactor = max(dot(normalize(scene.lightPos - input.fragPos), input.fragNorm), 0.0);
    let lightingFactor = min(ambientFactor + visibility * lambertFactor, 1.0);

    return vec4(lightingFactor * albedo, 1.0);
}
`,k=`struct Scene {
  lightViewProjMatrix: mat4x4<f32>,
  cameraViewProjMatrix: mat4x4<f32>,
  lightPos: vec3<f32>,
}

struct Model {
  modelMatrix: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> scene : Scene;
@group(1) @binding(0) var<uniform> model : Model;

struct VertexOutput {
  @location(0) shadowPos: vec3<f32>,
  @location(1) fragPos: vec3<f32>,
  @location(2) fragNorm: vec3<f32>,

  @builtin(position) Position: vec4<f32>,
}

@vertex
fn main(
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>
) -> VertexOutput {
    var output: VertexOutput;

    // XY is in (-1, 1) space, Z is in (0, 1) space
    let posFromLight = scene.lightViewProjMatrix * model.modelMatrix * vec4(position, 1.0);

    // Convert XY to (0, 1)
    // Y is flipped because texture coords are Y-down.
    output.shadowPos = vec3(
        posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
        posFromLight.z
    );

    output.Position = scene.cameraViewProjMatrix * model.modelMatrix * vec4(position, 1.0);
    output.fragPos = output.Position.xyz;
    output.fragNorm = normal;
    return output;
}
`,q=`struct Scene {
  lightViewProjMatrix: mat4x4<f32>,
  cameraViewProjMatrix: mat4x4<f32>,
  lightPos: vec3<f32>,
}

struct Model {
  modelMatrix: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> scene : Scene;
@group(1) @binding(0) var<uniform> model : Model;

@vertex
fn main(
    @location(0) position: vec3<f32>
) -> @builtin(position) vec4<f32> {
    return scene.lightViewProjMatrix * model.modelMatrix * vec4(position, 1.0);
}
`,x=1024,X=async o=>{const w=window.devicePixelRatio||1;o.width=o.clientWidth*w,o.height=o.clientHeight*w;const j=o.width/o.height,B=await new N().init(),s=new Float32Array(i.positions.length*3*2);for(let t=0;t<i.positions.length;++t)s.set(i.positions[t],6*t),s.set(i.normals[t],6*t+3);const v={position:{data:s,format:"float32x3",offset:0,arrayStride:Float32Array.BYTES_PER_ELEMENT*6},normal:{data:s,format:"float32x3",offset:Float32Array.BYTES_PER_ELEMENT*3,arrayStride:Float32Array.BYTES_PER_ELEMENT*6}},p=i.triangles.length*3,u=new Uint16Array(p);for(let t=0;t<i.triangles.length;++t)u.set(i.triangles[t],3*t);const P={size:[x,x,1],format:"depth32float"},b={topology:"triangle-list",cullMode:"back"},O={vertex:{code:q},primitive:b,depthStencil:{depthWriteEnabled:!0,depthCompare:"less"}},_={vertex:{code:k},fragment:{code:U,constants:{shadowDepthTextureSize:x}},primitive:b,depthStencil:{depthWriteEnabled:!0,depthCompare:"less"}},A={size:[o.width,o.height],format:"depth24plus-stencil8"},D={colorAttachments:[{view:{texture:{context:{canvasId:o.id}}},clearValue:[.5,.5,.5,1]}],depthStencilAttachment:{view:{texture:A},depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store",stencilClearValue:0,stencilLoadOp:"clear",stencilStoreOp:"store"}},M=new Uint8Array(4*16),n=new Uint8Array(2*4*16+4*4),T={scene:{bufferView:n}},L={scene:{bufferView:n},shadowMap:{texture:P},shadowSampler:{compare:"less"}},S={model:{bufferView:M}},z=a.fromValues(0,50,-100),m=a.fromValues(0,1,0),c=a.fromValues(0,0,0),y=e.perspective(2*Math.PI/5,j,1,2e3),C=e.lookAt(z,c,m),V=a.fromValues(50,100,-100),G=e.lookAt(V,c,m),E=e.create();e.ortho(-80,80,-80,80,-200,300,E);const I=e.multiply(E,G),h=e.multiply(y,C),R=e.translation([0,-45,0]);{const t=I,r=h,l=V;g(f(n)).writeBuffers=[{bufferOffset:0,data:t},{bufferOffset:64,data:r},{bufferOffset:128,data:l}];const d=R;g(f(M)).writeBuffers=[{data:d}]}function W(){const t=a.fromValues(0,50,-100),r=Math.PI*(Date.now()/2e3),l=e.rotateY(e.translation(c),r);a.transformMat4(t,l,t);const d=e.lookAt(t,c,m);return e.multiply(y,d,h),h}const Y={commandEncoders:[{passEncoders:[{descriptor:{colorAttachments:[],depthStencilAttachment:{view:{texture:P},depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},renderPassObjects:[{pipeline:O,bindingResources:{...T,...S},vertices:v,indices:u,draw:{__type__:"DrawIndexed",indexCount:p}}]},{descriptor:D,renderPassObjects:[{pipeline:_,bindingResources:{...L,...S},vertices:v,indices:u,draw:{__type__:"DrawIndexed",indexCount:p}}]}]}]};function F(){const t=W(),r=f(n).writeBuffers||[];r.push({bufferOffset:64,data:t}),g(f(n)).writeBuffers=r,B.submit(Y),requestAnimationFrame(F)}requestAnimationFrame(F)},H=document.getElementById("webgpu");X(H);
