import"../../../modulepreload-polyfill-3cfb730f.js";import{W as E,r as N}from"../../../Buffer-23ffa079.js";import{G as $}from"../../../dat.gui.module-5ea4ba08.js";import{m as f,v as Y}from"../../../wgpu-matrix.module-82499b8f.js";function J(i,l,m){const g=[{tangent:5,bitangent:2,normal:0},{tangent:4,bitangent:2,normal:1},{tangent:0,bitangent:5,normal:2},{tangent:0,bitangent:4,normal:3},{tangent:0,bitangent:2,normal:4},{tangent:1,bitangent:2,normal:5}],s=4,P=6,S=14,I=S*4,p=new Float32Array(g.length*s*S),d=new Uint16Array(g.length*P),b=[[Number(i)/2,0,0],[-i/2,0,0],[0,Number(l)/2,0],[0,-l/2,0],[0,0,Number(m)/2],[0,0,-m/2]];let r=0,c=0;for(let n=0;n<g.length;n++){const x=g[n],M=b[x.tangent],D=b[x.bitangent],B=b[x.normal];for(let v=0;v<2;v++)for(let w=0;w<2;w++){for(let o=0;o<3;o++)p[r++]=B[o]+(v===0?-1:1)*M[o]+(w===0?-1:1)*D[o];for(let o=0;o<3;o++)p[r++]=B[o];p[r++]=v,p[r++]=w;for(let o=0;o<3;o++)p[r++]=M[o];for(let o=0;o<3;o++)p[r++]=D[o]}d[c++]=n*s+0,d[c++]=n*s+2,d[c++]=n*s+1,d[c++]=n*s+2,d[c++]=n*s+3,d[c++]=n*s+1}return{vertices:p,indices:d,vertexStride:I}}const O=`const modeAlbedoTexture = 0;
const modeNormalTexture = 1;
const modeDepthTexture = 2;
const modeNormalMap = 3;
const modeParallaxScale = 4;
const modeSteepParallax = 5;

struct SpaceTransforms {
  worldViewProjMatrix: mat4x4f,
  worldViewMatrix: mat4x4f,
}

struct MapInfo {
  lightPosVS: vec3f, // Light position in view space
  mode: u32,
  lightIntensity: f32,
  depthScale: f32,
  depthLayers: f32,
}

struct VertexInput {
  // Shader assumes the missing 4th float is 1.0
  @location(0) position : vec4f,
  @location(1) normal : vec3f,
  @location(2) uv : vec2f,
  @location(3) vert_tan: vec3f,
  @location(4) vert_bitan: vec3f,
}

struct VertexOutput {
  @builtin(position) posCS : vec4f,    // vertex position in clip space
  @location(0) posVS : vec3f,          // vertex position in view space
  @location(1) tangentVS: vec3f,       // vertex tangent in view space
  @location(2) bitangentVS: vec3f,     // vertex tangent in view space
  @location(3) normalVS: vec3f,        // vertex normal in view space
  @location(5) uv : vec2f,             // vertex texture coordinate
}

// Uniforms
@group(0) @binding(0) var<uniform> spaceTransform : SpaceTransforms;
@group(0) @binding(1) var<uniform> mapInfo: MapInfo;

// Texture info
@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var albedoTexture: texture_2d<f32>;
@group(1) @binding(2) var normalTexture: texture_2d<f32>;
@group(1) @binding(3) var depthTexture: texture_2d<f32>;


@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;

  output.posCS = spaceTransform.worldViewProjMatrix * input.position;
  output.posVS = (spaceTransform.worldViewMatrix * input.position).xyz;
  output.tangentVS = (spaceTransform.worldViewMatrix * vec4(input.vert_tan, 0)).xyz;
  output.bitangentVS = (spaceTransform.worldViewMatrix * vec4(input.vert_bitan, 0)).xyz;
  output.normalVS = (spaceTransform.worldViewMatrix * vec4(input.normal, 0)).xyz;
  output.uv = input.uv;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Build the matrix to convert from tangent space to view space
  let tangentToView = mat3x3f(
    input.tangentVS,
    input.bitangentVS,
    input.normalVS,
  );

  // The inverse of a non-scaling affine 3x3 matrix is it's transpose
  let viewToTangent = transpose(tangentToView);

  // Calculate the normalized vector in tangent space from the camera to the fragment
  let viewDirTS = normalize(viewToTangent * input.posVS);

  // Apply parallax to the texture coordinate, if parallax is enabled
  var uv : vec2f;
  switch (mapInfo.mode) {
    case modeParallaxScale: {
      uv = parallaxScale(input.uv, viewDirTS);
      break;
    }
    case modeSteepParallax: {
      uv = parallaxSteep(input.uv, viewDirTS);
      break;
    }
    default: {
      uv = input.uv;
      break;
    }
  }

  // Sample the albedo texture
  let albedoSample = textureSample(albedoTexture, textureSampler, uv);

  // Sample the normal texture
  let normalSample = textureSample(normalTexture, textureSampler, uv);

  switch (mapInfo.mode) {
    case modeAlbedoTexture: { // Output the albedo sample
      return albedoSample;
    }
    case modeNormalTexture: { // Output the normal sample
      return normalSample;
    }
    case modeDepthTexture: { // Output the depth map
      return textureSample(depthTexture, textureSampler, input.uv);
    }
    default: {
      // Transform the normal sample to a tangent space normal
      let normalTS = normalSample.xyz * 2 - 1;

      // Convert normal from tangent space to view space, and normalize
      let normalVS = normalize(tangentToView * normalTS);

      // Calculate the vector in view space from the light position to the fragment
      let fragToLightVS = mapInfo.lightPosVS - input.posVS;

      // Calculate the square distance from the light to the fragment
      let lightSqrDist = dot(fragToLightVS, fragToLightVS);

      // Calculate the normalized vector in view space from the fragment to the light
      let lightDirVS = fragToLightVS * inverseSqrt(lightSqrDist);

      // Light strength is inversely proportional to square of distance from light
      let diffuseLight = mapInfo.lightIntensity * max(dot(lightDirVS, normalVS), 0) / lightSqrDist;

      // The diffuse is the albedo color multiplied by the diffuseLight
      let diffuse = albedoSample.rgb * diffuseLight;

      return vec4f(diffuse, 1.0);
    }
  }
}


// Returns the uv coordinate displaced in the view direction by a magnitude calculated by the depth
// sampled from the depthTexture and the angle between the surface normal and view direction.
fn parallaxScale(uv: vec2f, viewDirTS: vec3f) -> vec2f {
  let depthSample = textureSample(depthTexture, textureSampler, uv).r;
  return uv + viewDirTS.xy * (depthSample * mapInfo.depthScale) / -viewDirTS.z;
}

// Returns the uv coordinates displaced in the view direction by ray-tracing the depth map.
fn parallaxSteep(startUV: vec2f, viewDirTS: vec3f) -> vec2f {
  // Calculate derivatives of the texture coordinate, so we can sample the texture with non-uniform
  // control flow.
  let ddx = dpdx(startUV);
  let ddy = dpdy(startUV);

  // Calculate the delta step in UV and depth per iteration
  let uvDelta = viewDirTS.xy * mapInfo.depthScale / (-viewDirTS.z * mapInfo.depthLayers);
  let depthDelta = 1.0 / f32(mapInfo.depthLayers);
  let posDelta = vec3(uvDelta, depthDelta);

  // Walk the depth texture, and stop when the ray intersects the depth map
  var pos = vec3(startUV, 0);
  for (var i = 0; i < 32; i++) {
    if (pos.z >= textureSampleGrad(depthTexture, textureSampler, pos.xy, ddx, ddy).r) {
      break; // Hit the surface
    }
    pos += posDelta;
  }

  return pos.xy;
}
`,K=(i,l,m,V=!1)=>{let h;return V&&(h={depthCompare:"less",depthWriteEnabled:!0}),{label:`${i}.pipeline`,vertex:{code:l},fragment:{code:m},primitive:{topology:"triangle-list",cullFace:"back"},depthStencil:h}},u=i=>({size:[i.width,i.height],format:"rgba8unorm",sources:[{image:i}]}),Q=async(i,l)=>{const m=window.devicePixelRatio||1;i.width=i.clientWidth*m,i.height=i.clientHeight*m;const V=await new E().init();let h;(e=>{e[e.Spiral=0]="Spiral",e[e.Toybox=1]="Toybox",e[e.BrickWall=2]="BrickWall"})(h||(h={}));const t={"Bump Mode":"Normal Map",cameraPosX:0,cameraPosY:.8,cameraPosZ:-1.4,lightPosX:1.7,lightPosY:.7,lightPosZ:-1.9,lightIntensity:5,depthScale:.05,depthLayers:16,Texture:"Spiral","Reset Light":()=>{}},C={size:[i.width,i.height],format:"depth24plus"};let y;{const e=await fetch("../../../assets/img/wood_albedo.png"),a=await createImageBitmap(await e.blob());y=u(a)}let L;{const e=await fetch("../../../assets/img/spiral_normal.png"),a=await createImageBitmap(await e.blob());L=u(a)}let g;{const e=await fetch("../../../assets/img/spiral_height.png"),a=await createImageBitmap(await e.blob());g=u(a)}let s;{const e=await fetch("../../../assets/img/toybox_normal.png"),a=await createImageBitmap(await e.blob());s=u(a)}let P;{const e=await fetch("../../../assets/img/toybox_height.png"),a=await createImageBitmap(await e.blob());P=u(a)}let S;{const e=await fetch("../../../assets/img/brickwall_albedo.png"),a=await createImageBitmap(await e.blob());S=u(a)}let I;{const e=await fetch("../../../assets/img/brickwall_normal.png"),a=await createImageBitmap(await e.blob());I=u(a)}let p;{const e=await fetch("../../../assets/img/brickwall_height.png"),a=await createImageBitmap(await e.blob());p=u(a)}const d={magFilter:"linear",minFilter:"linear"},b={colorAttachments:[{view:{texture:{context:{canvasId:i.id}}},clearValue:[0,0,0,1],loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:{texture:C},depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},r=J(1,1,1),c={worldViewProjMatrix:void 0,worldViewMatrix:void 0},n={lightPosVS:void 0,mode:void 0,lightIntensity:void 0,depthScale:void 0,depthLayers:void 0},x={spaceTransform:c,mapInfo:n,textureSampler:d,albedoTexture:{texture:y},normalTexture:{texture:L},depthTexture:{texture:g}},M=[x,{...x,albedoTexture:{texture:y},normalTexture:{texture:s},depthTexture:{texture:P}},{...x,albedoTexture:{texture:S},normalTexture:{texture:I},depthTexture:{texture:p}}],D=i.width/i.height,B=f.perspective(2*Math.PI/5,D,.1,10);function v(){return f.lookAt([t.cameraPosX,t.cameraPosY,t.cameraPosZ],[0,0,0],[0,1,0])}function w(){const e=f.create();f.identity(e);const a=Date.now()/1e3;return f.rotateY(e,a*-.5,e),e}const o=()=>{switch(t["Bump Mode"]){case"Albedo Texture":return 0;case"Normal Texture":return 1;case"Depth Texture":return 2;case"Normal Map":return 3;case"Parallax Scale":return 4;case"Steep Parallax":return 5}},X=K("NormalMappingRender",O,O,!0);let _=0;const Z=()=>{_=h[t.Texture]};l.add(t,"Bump Mode",["Albedo Texture","Normal Texture","Depth Texture","Normal Map","Parallax Scale","Steep Parallax"]),l.add(t,"Texture",["Spiral","Toybox","BrickWall"]).onChange(Z);const T=l.addFolder("Light"),k=l.addFolder("Depth");T.add(t,"Reset Light").onChange(()=>{R.setValue(1.7),W.setValue(.7),F.setValue(-1.9),A.setValue(5)});const R=T.add(t,"lightPosX",-5,5).step(.1),W=T.add(t,"lightPosY",-5,5).step(.1),F=T.add(t,"lightPosZ",-5,5).step(.1),A=T.add(t,"lightIntensity",0,10).step(.1);k.add(t,"depthScale",0,.1).step(.01),k.add(t,"depthLayers",1,32).step(1);function z(){const e=v(),a=f.mul(e,w()),U=f.mul(B,a);N(c).worldViewMatrix=a,N(c).worldViewProjMatrix=U;const j=Y.create(t.lightPosX,t.lightPosY,t.lightPosZ),q=Y.transformMat4(j,e),G=o();n.lightPosVS=q,n.mode=G,n.lightIntensity=t.lightIntensity,n.depthScale=t.depthScale,n.depthLayers=t.depthLayers;const H={commandEncoders:[{passEncoders:[{descriptor:b,renderPassObjects:[{pipeline:X,bindingResources:M[_],vertices:{position:{data:r.vertices,offset:0,format:"float32x3",arrayStride:r.vertexStride},normal:{data:r.vertices,offset:12,format:"float32x3",arrayStride:r.vertexStride},uv:{data:r.vertices,offset:24,format:"float32x2",arrayStride:r.vertexStride},vert_tan:{data:r.vertices,offset:32,format:"float32x3",arrayStride:r.vertexStride},vert_bitan:{data:r.vertices,offset:44,format:"float32x3",arrayStride:r.vertexStride}},indices:r.indices,draw:{__type__:"DrawIndexed",indexCount:r.indices.length}}]}]}]};V.submit(H),requestAnimationFrame(z)}z()},ee=new $,te=document.getElementById("webgpu");Q(te,ee);
