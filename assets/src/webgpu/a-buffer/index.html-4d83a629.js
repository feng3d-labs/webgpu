import"../../../modulepreload-polyfill-3cfb730f.js";import{W as ie,g as W,r as y}from"../../../Buffer-5212487c.js";import{G as oe}from"../../../dat.gui.module-5ea4ba08.js";import{m as a,v as u}from"../../../wgpu-matrix.module-82499b8f.js";import{m as f}from"../../../teapot-c6c08f92.js";import"../../../utils-90ee43e9.js";const k=`struct Uniforms {
  modelViewProjectionMatrix: mat4x4f,
  maxStorableFragments: u32,
  targetWidth: u32,
};

struct SliceInfo {
  sliceStartY: i32
};

struct Heads {
  numFragments: u32,
  data: array<u32>
};

struct LinkedListElement {
  color: vec4f,
  depth: f32,
  next: u32
};

struct LinkedList {
  data: array<LinkedListElement>
};

@binding(0) @group(0) var<uniform> uniforms: Uniforms;
@binding(1) @group(0) var<storage, read_write> heads: Heads;
@binding(2) @group(0) var<storage, read_write> linkedList: LinkedList;
@binding(3) @group(0) var<uniform> sliceInfo: SliceInfo;

// Output a full screen quad
@vertex
fn main_vs(@builtin(vertex_index) vertIndex: u32) -> @builtin(position) vec4f {
  const position = array<vec2f, 6>(
    vec2(-1.0, -1.0),
    vec2(1.0, -1.0),
    vec2(1.0, 1.0),
    vec2(-1.0, -1.0),
    vec2(1.0, 1.0),
    vec2(-1.0, 1.0),
  );
  
  return vec4(position[vertIndex], 0.0, 1.0);
}

@fragment
fn main_fs(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let fragCoords = vec2i(position.xy);
  let headsIndex = u32(fragCoords.y - sliceInfo.sliceStartY) * uniforms.targetWidth + u32(fragCoords.x);

  // The maximum layers we can process for any pixel
  const maxLayers = 12u;

  var layers: array<LinkedListElement, maxLayers>;

  var numLayers = 0u;
  var elementIndex = heads.data[headsIndex];

  // copy the list elements into an array up to the maximum amount of layers
  while elementIndex != 0xFFFFFFFFu && numLayers < maxLayers {
    layers[numLayers] = linkedList.data[elementIndex];
    numLayers++;
    elementIndex = linkedList.data[elementIndex].next;
  }

  if numLayers == 0u {
    discard;
  }
  
  // sort the fragments by depth
  for (var i = 1u; i < numLayers; i++) {
    let toInsert = layers[i];
    var j = i;

    while j > 0u && toInsert.depth > layers[j - 1u].depth {
      layers[j] = layers[j - 1u];
      j--;
    }

    layers[j] = toInsert;
  }

  // pre-multiply alpha for the first layer
  var color = vec4(layers[0].color.a * layers[0].color.rgb, layers[0].color.a);

  // blend the remaining layers
  for (var i = 1u; i < numLayers; i++) {
    let mixed = mix(color.rgb, layers[i].color.rgb, layers[i].color.aaa);
    color = vec4(mixed, color.a);
  }

  return color;
}
`,T=`struct Uniforms {
  modelViewProjectionMatrix: mat4x4f,
  maxStorableFragments: u32,
  targetWidth: u32,
};

@binding(0) @group(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) instance: u32
};

@vertex
fn main_vs(@location(0) position: vec4f, @builtin(instance_index) instance: u32) -> VertexOutput {
  var output: VertexOutput;

  // distribute instances into a staggered 4x4 grid
  const gridWidth = 125.0;
  const cellSize = gridWidth / 4.0;
  let row = instance / 2u;
  let col = instance % 2u;

  let xOffset = -gridWidth / 2.0 + cellSize / 2.0 + 2.0 * cellSize * f32(col) + f32(row % 2u != 0u) * cellSize;
  let zOffset = -gridWidth / 2.0 + cellSize / 2.0 + 2.0 + f32(row) * cellSize;

  let offsetPos = vec4(position.x + xOffset, position.y, position.z + zOffset, position.w);

  output.position = uniforms.modelViewProjectionMatrix * offsetPos;
  output.instance = instance;
  return output;
}

@fragment
fn main_fs(@location(0) @interpolate(flat) instance: u32) -> @location(0) vec4f {
  const colors = array<vec3f,6>(
      vec3(1.0, 0.0, 0.0),
      vec3(0.0, 1.0, 0.0),
      vec3(0.0, 0.0, 1.0),
      vec3(1.0, 0.0, 1.0),
      vec3(1.0, 1.0, 0.0),
      vec3(0.0, 1.0, 1.0),
  );

  return vec4(colors[instance % 6u], 1.0);
}
`,A=`struct Uniforms {
  modelViewProjectionMatrix: mat4x4f,
  maxStorableFragments: u32,
  targetWidth: u32,
};

struct SliceInfo {
  sliceStartY: i32
};

struct Heads {
  numFragments: atomic<u32>,
  data: array<atomic<u32>>
};

struct LinkedListElement {
  color: vec4f,
  depth: f32,
  next: u32
};

struct LinkedList {
  data: array<LinkedListElement>
};

@binding(0) @group(0) var<uniform> uniforms: Uniforms;
@binding(1) @group(0) var<storage, read_write> heads: Heads;
@binding(2) @group(0) var<storage, read_write> linkedList: LinkedList;
@binding(3) @group(0) var opaqueDepthTexture: texture_depth_2d;
@binding(4) @group(0) var<uniform> sliceInfo: SliceInfo;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) instance: u32
};

@vertex
fn main_vs(@location(0) position: vec4f, @builtin(instance_index) instance: u32) -> VertexOutput {
  var output: VertexOutput;

  // distribute instances into a staggered 4x4 grid
  const gridWidth = 125.0;
  const cellSize = gridWidth / 4.0;
  let row = instance / 2u;
  let col = instance % 2u;

  let xOffset = -gridWidth / 2.0 + cellSize / 2.0 + 2.0 * cellSize * f32(col) + f32(row % 2u == 0u) * cellSize;
  let zOffset = -gridWidth / 2.0 + cellSize / 2.0 + 2.0 + f32(row) * cellSize;

  let offsetPos = vec4(position.x + xOffset, position.y, position.z + zOffset, position.w);

  output.position = uniforms.modelViewProjectionMatrix * offsetPos;
  output.instance = instance;

  return output;
}

@fragment
fn main_fs(@builtin(position) position: vec4f, @location(0) @interpolate(flat) instance: u32) {
  const colors = array<vec3f,6>(
    vec3(1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0),
    vec3(1.0, 0.0, 1.0),
    vec3(1.0, 1.0, 0.0),
    vec3(0.0, 1.0, 1.0),
  );

  let fragCoords = vec2i(position.xy);
  let opaqueDepth = textureLoad(opaqueDepthTexture, fragCoords, 0);

  // reject fragments behind opaque objects
  if position.z >= opaqueDepth {
    discard;
  }

  // The index in the heads buffer corresponding to the head data for the fragment at
  // the current location.
  let headsIndex = u32(fragCoords.y - sliceInfo.sliceStartY) * uniforms.targetWidth + u32(fragCoords.x);

  // The index in the linkedList buffer at which to store the new fragment
  let fragIndex = atomicAdd(&heads.numFragments, 1u);

  // If we run out of space to store the fragments, we just lose them
  if fragIndex < uniforms.maxStorableFragments {
    let lastHead = atomicExchange(&heads.data[headsIndex], fragIndex);
    linkedList.data[fragIndex].depth = position.z;
    linkedList.data[fragIndex].next = lastHead;
    linkedList.data[fragIndex].color = vec4(colors[(instance + 3u) % 6u], 0.3);
  }
}
`,re=async(e,C)=>{function D(r,m){return Math.ceil(r/m)*m}const b=window.devicePixelRatio||1;e.width=e.clientWidth*b,e.height=e.clientHeight*b;const L=await new ie().init(),p={canvasId:e.id,configuration:{alphaMode:"opaque"}},S={memoryStrategy:new URLSearchParams(window.location.search).get("memoryStrategy")||"multipass"},P={position:{data:new Float32Array(f.positions.flat()),format:"float32x3",arrayStride:12}},I=new Uint16Array(f.triangles.flat()),U=D(16*Float32Array.BYTES_PER_ELEMENT+2*Uint32Array.BYTES_PER_ELEMENT,16),c={bufferView:new Uint8Array(U),modelViewProjectionMatrix:void 0,maxStorableFragments:void 0,targetWidth:void 0},q={vertex:{code:T},fragment:{code:T},primitive:{topology:"triangle-list"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less"},label:"opaquePipeline"},B={vertex:{code:A},fragment:{code:A,targets:[{writeMask:[!1,!1,!1,!1]}]},primitive:{topology:"triangle-list"},label:"translucentPipeline"},R={colorAttachments:[{loadOp:"load",storeOp:"store",view:{texture:{context:p}}}],label:"translucentPassDescriptor"},Y={vertex:{code:k},fragment:{code:k,targets:[{blend:{color:{srcFactor:"one",operation:"add",dstFactor:"one-minus-src-alpha"},alpha:{}}}]},primitive:{topology:"triangle-list"},label:"compositePipeline"},H={colorAttachments:[{view:{texture:{context:p}},loadOp:"load",storeOp:"store"}],label:"compositePassDescriptor"},_=()=>{let r=window.devicePixelRatio;S.memoryStrategy==="clamp-pixel-ratio"&&(r=Math.min(window.devicePixelRatio,3)),e.width=e.clientWidth*r,e.height=e.clientHeight*r;const M={label:"depthTextureView",texture:{size:[e.width,e.height],format:"depth24plus",label:"depthTexture"}},V=4,N=5*Float32Array.BYTES_PER_ELEMENT+Number(Uint32Array.BYTES_PER_ELEMENT),O=e.width*V*N,X=Math.floor(L.device.limits.maxStorageBufferBindingSize/O),h=Math.ceil(e.height/X),i=Math.ceil(e.height/h),$=i*O,J={bufferView:new Uint8Array($)},g=[];for(let t=0;t<h;++t)g[t]={sliceStartY:t*i};const z={bufferView:new Uint32Array(1+e.width*i),numFragments:void 0,data:void 0},j=new Uint32Array(1+e.width*i);j.fill(4294967295);const x={uniforms:c,heads:z,linkedList:J,opaqueDepthTexture:M,sliceInfo:{sliceStartY:void 0}},K={colorAttachments:[{view:{texture:{context:p}},clearValue:[0,0,0,1],loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:M,depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"},label:"opaquePassDescriptor"};function Q(){const t=e.width/e.height,l=a.perspective(2*Math.PI/5,t,1,2e3),d=u.fromValues(0,1,0),s=u.fromValues(0,0,0),o=u.fromValues(0,5,-100),w=Math.PI*(Date.now()/5e3),v=a.rotateY(a.translation(s),w);u.transformMat4(o,v,o);const te=a.lookAt(o,s,d);return a.multiply(l,te)}const n=[],Z={descriptor:K,renderPassObjects:[{pipeline:q,bindingResources:x,vertices:P,indices:I,draw:{__type__:"DrawIndexed",indexCount:f.triangles.length*3,instanceCount:8}}]};n.push(Z);for(let t=0;t<h;++t){n.push({__type__:"CopyBufferToBuffer",source:W(j),destination:W(z.bufferView)});const l=0,d=t*i,s=e.width,o=Math.min((t+1)*i,e.height)-t*i,w={descriptor:R,renderPassObjects:[{scissorRect:{x:l,y:d,width:s,height:o},pipeline:B,bindingResources:{...x,sliceInfo:g[t]},vertices:P,indices:I,draw:{__type__:"DrawIndexed",indexCount:f.triangles.length*3,instanceCount:8}}]};n.push(w);const v={descriptor:H,renderPassObjects:[{scissorRect:{x:l,y:d,width:s,height:o},pipeline:Y,bindingResources:{...x,sliceInfo:g[t]},draw:{__type__:"DrawVertex",vertexCount:6}}]};n.push(v)}const ee={commandEncoders:[{passEncoders:n}]};return y(c).maxStorableFragments=V*e.width*i,y(c).targetWidth=e.width,function(){y(c).modelViewProjectionMatrix=Q(),L.submit(ee)}};let E=_();const G=()=>{E=_()};C.add(S,"memoryStrategy",["multipass","clamp-pixel-ratio"]).onFinishChange(G);function F(){E(),requestAnimationFrame(F)}requestAnimationFrame(F)},ne=new oe({width:310}),se=document.getElementById("webgpu");re(se,ne);
