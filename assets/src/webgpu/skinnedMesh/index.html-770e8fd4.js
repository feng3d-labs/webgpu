import"../../../modulepreload-polyfill-3cfb730f.js";import{G as oe}from"../../../dat.gui.module-5ea4ba08.js";import{m as a,v as G,q as ae}from"../../../wgpu-matrix.module-82499b8f.js";import{v as R,r as O,g as k,W as ce}from"../../../Buffer-23ffa079.js";const fe=(o,e)=>Math.floor((o+e-1)/e)*e,ue=o=>{switch(o){case"SCALAR":return 0;case"VEC2":return 1;case"VEC3":return 2;case"VEC4":return 3;case"MAT2":return 4;case"MAT3":return 5;case"MAT4":return 6;default:throw Error(`Unhandled glTF Type ${o}`)}},Y=o=>{switch(o){case 0:return 1;case 1:return 2;case 2:return 3;case 3:case 4:return 4;case 5:return 9;case 6:return 16;default:throw Error(`Invalid glTF Type ${o}`)}},de=(o,e)=>{let t=null;switch(o){case 5120:t="sint8";break;case 5121:t="uint8";break;case 5122:t="sint16";break;case 5123:t="uint16";break;case 5124:t="int32";break;case 5125:t="uint32";break;case 5126:t="float32";break;default:throw Error(`Unrecognized or unsupported glTF type ${o}`)}switch(Y(e)){case 1:return t;case 2:return`${t}x2`;case 3:return`${t}x3`;case 4:return`${t}x4`;default:throw Error(`Invalid number of components for gltfType: ${e}`)}},le=(o,e)=>{let t=0;switch(o){case 5120:t=1;break;case 5121:t=1;break;case 5122:t=2;break;case 5123:t=2;break;case 5124:t=4;break;case 5125:t=4;break;case 5126:t=4;break;case 5130:t=8;break;default:throw Error("Unrecognized GLTF Component Type?")}return Y(e)*t},pe=o=>{switch(o){case"float32":return"f32";case"float32x2":return"vec2f";case"float32x3":return"vec3f";case"float32x4":return"vec4f";case"uint32":return"u32";case"uint32x2":return"vec2u";case"uint32x3":return"vec3u";case"uint32x4":return"vec4u";case"uint8x2":return"vec2u";case"uint8x4":return"vec4u";case"uint16x4":return"vec4u";case"uint16x2":return"vec2u";default:return"f32"}};class he{constructor(e,t,r){this.buffer=new Uint8Array(e,t,r)}}class me{constructor(e,t){this.byteLength=t.byteLength,this.byteStride=0,t.byteStride!==void 0&&(this.byteStride=t.byteStride);let r=0;t.byteOffset!==void 0&&(r=t.byteOffset),this.view=e.buffer.subarray(r,r+this.byteLength),this.needsUpload=!1,this.gpuBuffer=null,this.usage=0}addUsage(e){this.usage=this.usage|e}upload(){const e={size:fe(this.view.byteLength,4),usage:this.usage,data:this.view};this.gpuBuffer=e,this.needsUpload=!1}}class we{constructor(e,t){this.count=t.count,this.componentType=t.componentType,this.structureType=ue(t.type),this.view=e,this.byteOffset=0,t.byteOffset!==void 0&&(this.byteOffset=t.byteOffset)}get byteStride(){const e=le(this.componentType,this.structureType);return Math.max(e,this.view.byteStride)}get byteLength(){return this.count*this.byteStride}get vertexType(){return de(this.componentType,this.structureType)}}class be{constructor(e,t,r){this.attributes=[],this.topology=e,this.renderPipeline=null,this.attributeMap=t,this.attributes=r,this.vertices={},this.attributes.forEach((d,m)=>{const l=this.attributeMap[d].view.view,i=this.attributeMap[d].vertexType,b=d.toLowerCase().replace(/_0$/,""),g=R[i].typedArrayConstructor,v=new g(l.buffer,l.byteOffset,l.byteLength/g.BYTES_PER_ELEMENT);this.vertices[b]={data:v,format:i}});{const d=t.INDICES,m=d.view.view,l=d.vertexType;let i;l==="uint16"?i=Uint16Array:i=Uint32Array,this.indices=new i(m.buffer,m.byteOffset,m.byteLength/i.BYTES_PER_ELEMENT)}}buildRenderPipeline(e,t,r){let d=`struct VertexInput {
`;this.attributes.forEach((b,g)=>{const v=this.attributeMap[b].vertexType,M=b.toLowerCase().replace(/_0$/,"");d+=`	@location(${g}) ${M}: ${pe(v)},
`}),d+="}";const m={code:d+e},l={code:d+t},i={label:`${r}.pipeline`,vertex:m,fragment:l,depthStencil:{depthWriteEnabled:!0,depthCompare:"less"}};this.renderPipeline=i}render(e,t){let r;if(this.indices)r={__type__:"DrawIndexed",indexCount:this.indices.length};else{const l=this.vertices[Object.keys(this.vertices)[0]];r={__type__:"DrawVertex",vertexCount:l.data.byteLength/R[l.format].byteSize}}let d={topology:"triangle-list"};this.topology==5&&(d={topology:"triangle-strip"}),O(this.renderPipeline).primitive=d;const m={pipeline:this.renderPipeline,bindingResources:t,vertices:this.vertices,indices:this.indices,draw:r};e.push(m)}}class ge{constructor(e,t){this.name=e,this.primitives=t}buildRenderPipeline(e,t){for(let r=0;r<this.primitives.length;++r)this.primitives[r].buildRenderPipeline(e,t,`PrimitivePipeline${r}`)}render(e,t){for(let r=0;r<this.primitives.length;++r)this.primitives[r].render(e,t)}}const ve=o=>{if(o.getUint32(0,!0)!=1179937895)throw Error("Provided file is not a glB file");if(o.getUint32(4,!0)!=2)throw Error("Provided file is glTF 2.0 file")},xe=o=>{if(o[1]!=5130562)throw Error("Invalid glB: The second chunk of the glB file is not a binary chunk!")};class Z{constructor(e=[0,0,0],t=[0,0,0,1],r=[1,1,1]){this.position=e,this.rotation=t,this.scale=r}getMatrix(){const e=a.identity();a.scale(e,this.scale,e);const t=a.fromQuat(this.rotation);return a.multiply(t,e,e),a.translate(e,this.position,e),e}}class H{constructor(e,t,r){this.test=0,this.nodeTransformBindGroup={node_uniforms:{world_matrix:new Float32Array(16)}},this.name=t||`node_${e.position} ${e.rotation} ${e.scale}`,this.source=e,this.parent=null,this.children=[],this.localMatrix=a.identity(),this.worldMatrix=a.identity(),this.drawables=[],this.skin=r}setParent(e){this.parent&&(this.parent.removeChild(this),this.parent=null),e.addChild(this),this.parent=e}updateWorldMatrix(e){this.localMatrix=this.source.getMatrix(),e?a.multiply(e,this.localMatrix,this.worldMatrix):a.copy(this.localMatrix,this.worldMatrix);const t=this.worldMatrix;this.nodeTransformBindGroup.node_uniforms.world_matrix=t;for(const r of this.children)r.updateWorldMatrix(t)}traverse(e){e(this);for(const t of this.children)t.traverse(e)}renderDrawables(e,t){if(this.drawables!==void 0)for(const r of this.drawables)this.skin?r.render(e,{...t,...this.nodeTransformBindGroup,...this.skin.skinBindGroup}):r.render(e,{...t,...this.nodeTransformBindGroup});for(const r of this.children)r.renderDrawables(e,t)}addChild(e){this.children.push(e)}removeChild(e){const t=this.children.indexOf(e);this.children.splice(t,1)}}class ye{constructor(e){this.nodes=e.nodes,this.name=e.name,this.root=new H(new Z,e.name)}}class _e{constructor(e,t){if(e.componentType!==5126||e.byteStride!==64)throw Error("This skin's provided accessor does not access a mat4x4f matrix, or does not access the provided mat4x4f data correctly");this.inverseBindMatrices=new Float32Array(e.view.view.buffer,e.view.view.byteOffset,e.view.view.byteLength/4),this.joints=t,this.jointMatricesUniformBuffer=new Float32Array(16*t.length),this.inverseBindMatricesUniformBuffer=new Float32Array(this.inverseBindMatrices),this.skinBindGroup={joint_matrices:{bufferView:this.jointMatricesUniformBuffer},inverse_bind_matrices:{bufferView:this.inverseBindMatricesUniformBuffer}}}update(e,t){const r=a.inverse(t[e].worldMatrix),d=k(this.jointMatricesUniformBuffer),m=d.writeBuffers||[];for(let l=0;l<this.joints.length;l++){const i=this.joints[l],b=a.identity();a.multiply(r,t[i].worldMatrix,b);const g=b;m.push({bufferOffset:l*64,data:g.buffer,dataOffset:g.byteOffset,size:g.byteLength})}O(d).writeBuffers=m}}const je=async o=>{const e=new DataView(o,0,20);ve(e);const t=e.getUint32(12,!0),r=JSON.parse(new TextDecoder("utf-8").decode(new Uint8Array(o,20,t))),d=new Uint32Array(o,20+t,2);xe(d);const m=new he(o,28+t,d[0]);for(const s of r.accessors)s.byteOffset=s.byteOffset??0,s.normalized=s.normalized??!1;for(const s of r.bufferViews)s.byteOffset=s.byteOffset??0;if(r.samplers)for(const s of r.samplers)s.wrapS=s.wrapS??10497,s.wrapT=s.wrapT??10947;for(const s of r.meshes)for(const f of s.primitives){if("indices"in f){const c=r.accessors[f.indices];r.accessors[f.indices].bufferViewUsage|=GPUBufferUsage.INDEX,r.bufferViews[c.bufferView].usage|=GPUBufferUsage.INDEX}for(const c of Object.values(f.attributes)){const w=r.accessors[c];r.accessors[c].bufferViewUsage|=GPUBufferUsage.VERTEX,r.bufferViews[w.bufferView].usage|=GPUBufferUsage.VERTEX}}const l=[];for(let s=0;s<r.bufferViews.length;++s)l.push(new me(m,r.bufferViews[s]));const i=[];for(let s=0;s<r.accessors.length;++s){const f=r.accessors[s],c=f.bufferView;i.push(new we(l[c],f))}const b=[];for(let s=0;s<r.meshes.length;s++){const f=r.meshes[s],c=[];for(let w=0;w<f.primitives.length;++w){const x=f.primitives[w];let j=x.mode;if(j===void 0&&(j=4),j!=4&&j!=5)throw Error(`Unsupported primitive mode ${x.mode}`);const S={},V=[];if(r.accessors[x.indices]!==void 0){const B=i[x.indices];S.INDICES=B}for(const B in x.attributes){const E=i[x.attributes[B]];if(S[B]=E,E.structureType>3)throw Error("Vertex attribute accessor accessed an unsupported data type for vertex attribute");V.push(B)}c.push(new be(j,S,V))}b.push(new ge(f.name,c))}const g=[];for(const s of r.skins){const f=i[s.inverseBindMatrices];f.view.addUsage(GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST),f.view.needsUpload=!0}for(let s=0;s<l.length;++s)l[s].needsUpload&&l[s].upload();for(const s of r.skins){const f=i[s.inverseBindMatrices],c=s.joints;g.push(new _e(f,c))}const v=[];for(const s of r.nodes){const f=new Z(s.translation,s.rotation,s.scale),c=new H(f,s.name,g[s.skin]),w=b[s.mesh];w&&c.drawables.push(w),v.push(c)}v.forEach((s,f)=>{const c=r.nodes[f].children;c&&c.forEach(w=>{v[w].setParent(s)})});const M=[];for(const s of r.scenes){const f=new ye(s);f.nodes.forEach(w=>{v[w].setParent(f.root)}),M.push(f)}return{meshes:b,nodes:v,scenes:M,skins:g}},z=`// Whale.glb Vertex attributes
// Read in VertexInput from attributes
// f32x3    f32x3   f32x2       u8x4       f32x4
struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) normal: vec3f,
  @location(1) joints: vec4f,
  @location(2) weights: vec4f,
}

struct CameraUniforms {
  proj_matrix: mat4x4f,
  view_matrix: mat4x4f,
  model_matrix: mat4x4f,
}

struct GeneralUniforms {
  render_mode: u32,
  skin_mode: u32,
}

struct NodeUniforms {
  world_matrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> camera_uniforms: CameraUniforms;
@group(1) @binding(0) var<uniform> general_uniforms: GeneralUniforms;
@group(2) @binding(0) var<uniform> node_uniforms: NodeUniforms;
@group(3) @binding(0) var<storage, read> joint_matrices: array<mat4x4f>;
@group(3) @binding(1) var<storage, read> inverse_bind_matrices: array<mat4x4f>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  // Compute joint_matrices * inverse_bind_matrices
  let joint0 = joint_matrices[input.joints[0]] * inverse_bind_matrices[input.joints[0]];
  let joint1 = joint_matrices[input.joints[1]] * inverse_bind_matrices[input.joints[1]];
  let joint2 = joint_matrices[input.joints[2]] * inverse_bind_matrices[input.joints[2]];
  let joint3 = joint_matrices[input.joints[3]] * inverse_bind_matrices[input.joints[3]];
  // Compute influence of joint based on weight
  let skin_matrix = 
    joint0 * input.weights[0] +
    joint1 * input.weights[1] +
    joint2 * input.weights[2] +
    joint3 * input.weights[3];
  // Position of the vertex relative to our world
  let world_position = vec4f(input.position.x, input.position.y, input.position.z, 1.0);
  // Vertex position with model rotation, skinning, and the mesh's node transformation applied.
  let skinned_position = camera_uniforms.model_matrix * skin_matrix * node_uniforms.world_matrix * world_position;
  // Vertex position with only the model rotation applied.
  let rotated_position = camera_uniforms.model_matrix * world_position;
  // Determine which position to used based on whether skinMode is turnd on or off.
  let transformed_position = select(
    rotated_position,
    skinned_position,
    general_uniforms.skin_mode == 0
  );
  // Apply the camera and projection matrix transformations to our transformed position;
  output.Position = camera_uniforms.proj_matrix * camera_uniforms.view_matrix * transformed_position;
  output.normal = input.normal;
  // Convert u32 joint data to f32s to prevent flat interpolation error.
  output.joints = vec4f(f32(input.joints[0]), f32(input.joints[1]), f32(input.joints[2]), f32(input.joints[3]));
  output.weights = input.weights;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  switch general_uniforms.render_mode {
    case 1: {
      return input.joints;
    } 
    case 2: {
      return input.weights;
    }
    default: {
      return vec4f(input.normal, 1.0);
    }
  }
}`,X=`struct VertexInput {
  @location(0) vert_pos: vec2f,
  @location(1) joints: vec4u,
  @location(2) weights: vec4f
}

struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) world_pos: vec3f,
  @location(1) joints: vec4f,
  @location(2) weights: vec4f,
}

struct CameraUniforms {
  projMatrix: mat4x4f,
  viewMatrix: mat4x4f,
  modelMatrix: mat4x4f,
}

struct GeneralUniforms {
  render_mode: u32,
  skin_mode: u32,
}

@group(0) @binding(0) var<uniform> camera_uniforms: CameraUniforms;
@group(1) @binding(0) var<uniform> general_uniforms: GeneralUniforms;
@group(2) @binding(0) var<storage, read> joint_matrices: array<mat4x4f>;
@group(2) @binding(1) var<storage, read> inverse_bind_matrices: array<mat4x4f>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  var bones = vec4f(0.0, 0.0, 0.0, 0.0);
  let position = vec4f(input.vert_pos.x, input.vert_pos.y, 0.0, 1.0);
  // Get relevant 4 bone matrices
  let joint0 = joint_matrices[input.joints[0]] * inverse_bind_matrices[input.joints[0]];
  let joint1 = joint_matrices[input.joints[1]] * inverse_bind_matrices[input.joints[1]];
  let joint2 = joint_matrices[input.joints[2]] * inverse_bind_matrices[input.joints[2]];
  let joint3 = joint_matrices[input.joints[3]] * inverse_bind_matrices[input.joints[3]];
  // Compute influence of joint based on weight
  let skin_matrix = 
    joint0 * input.weights[0] +
    joint1 * input.weights[1] +
    joint2 * input.weights[2] +
    joint3 * input.weights[3];
  // Bone transformed mesh
  output.Position = select(
    camera_uniforms.projMatrix * camera_uniforms.viewMatrix * camera_uniforms.modelMatrix * position,
    camera_uniforms.projMatrix * camera_uniforms.viewMatrix * camera_uniforms.modelMatrix * skin_matrix * position,
    general_uniforms.skin_mode == 0
  );

  //Get unadjusted world coordinates
  output.world_pos = position.xyz;
  output.joints = vec4f(f32(input.joints.x), f32(input.joints.y), f32(input.joints.z), f32(input.joints.w));
  output.weights = input.weights;
  return output;
}


@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  switch general_uniforms.render_mode {
    case 1: {
      return input.joints;
    }
    case 2: {
      return input.weights;
    }
    default: {
      return vec4f(255.0, 0.0, 1.0, 1.0); 
    }
  }
}`,Me=new Float32Array([0,1,0,-1,2,1,2,-1,4,1,4,-1,6,1,6,-1,8,1,8,-1,10,1,10,-1,12,1,12,-1]),Be=new Uint32Array([0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,0,1,2,0,0,1,2,0,0,2,0,0,0,2,0,0,0,1,2,3,0,1,2,3,0,2,3,0,0,2,3,0,0]),Oe=new Float32Array([1,0,0,0,1,0,0,0,.5,.5,0,0,.5,.5,0,0,1,0,0,0,1,0,0,0,.5,.5,0,0,.5,.5,0,0,1,0,0,0,1,0,0,0,.5,.5,0,0,.5,.5,0,0,1,0,0,0,1,0,0,0]),J=new Uint16Array([0,1,0,2,1,3,2,3,2,4,3,5,4,5,4,6,5,7,6,7,6,8,7,9,8,9,8,10,9,11,10,11,10,12,11,13,12,13]),Te=()=>({vertices:{vert_pos:{data:Me,format:"float32x2"},joints:{data:Be,format:"uint32x4"},weights:{data:Oe,format:"float32x4"}},indices:J}),ke=(o,e)=>({label:"SkinnedGridRenderer",vertex:{code:o},fragment:{code:e},primitive:{topology:"line-list"}}),Se=async(o,e)=>{let r;(n=>{n[n.NORMAL=0]="NORMAL",n[n.JOINTS=1]="JOINTS",n[n.WEIGHTS=2]="WEIGHTS"})(r||(r={}));let d;(n=>{n[n.ON=0]="ON",n[n.OFF=1]="OFF"})(d||(d={}));const m=window.devicePixelRatio||1;o.width=o.clientWidth*m,o.height=o.clientHeight*m;const l=await new ce().init(),i={cameraX:0,cameraY:-5.1,cameraZ:-14.6,objectScale:1,angle:.2,speed:50,object:"Whale",renderMode:"NORMAL",skinMode:"ON"};e.add(i,"object",["Whale","Skinned Grid"]).onChange(()=>{i.object==="Skinned Grid"?(i.cameraX=-10,i.cameraY=0,i.objectScale=1.27):i.skinMode==="OFF"?(i.cameraX=0,i.cameraY=0,i.cameraZ=-11):(i.cameraX=0,i.cameraY=-5.1,i.cameraZ=-14.6)}),e.add(i,"renderMode",["NORMAL","JOINTS","WEIGHTS"]).onChange(()=>{const n=k(s),u=n.writeBuffers||[];u.push({data:new Uint32Array([r[i.renderMode]])}),O(n).writeBuffers=u}),e.add(i,"skinMode",["ON","OFF"]).onChange(()=>{i.object==="Whale"&&(i.skinMode==="OFF"?(i.cameraX=0,i.cameraY=0,i.cameraZ=-11):(i.cameraX=0,i.cameraY=-5.1,i.cameraZ=-14.6));const n=k(s),u=n.writeBuffers||[];u.push({bufferOffset:4,data:new Uint32Array([d[i.skinMode]])}),O(n).writeBuffers=u});const b=e.addFolder("Animation Settings");b.add(i,"angle",.05,.5).step(.05),b.add(i,"speed",10,100).step(10);const g={size:[o.width,o.height],format:"depth24plus"},v=new Float32Array(48),M={camera_uniforms:{bufferView:v}},s=new Uint32Array(2),f={general_uniforms:{bufferView:s}},c=await fetch("../../../assets/gltf/whale.glb").then(n=>n.arrayBuffer()).then(n=>je(n));c.meshes[0].buildRenderPipeline(z,z);const w=Te(),x=new Uint8Array(64*5),j=new Uint8Array(64*5),S={joint_matrices:{bufferView:x},inverse_bind_matrices:{bufferView:j}},V=ke(X,X),B=o.width/o.height,E=a.perspective(2*Math.PI/5,B,.1,100),q=a.ortho(-20,20,-10,10,-100,100);function Q(){return i.object!=="Skinned Grid"?E:q}function K(){const n=a.identity();return i.object==="Skinned Grid"?a.translate(n,G.fromValues(i.cameraX*i.objectScale,i.cameraY*i.objectScale,i.cameraZ),n):a.translate(n,G.fromValues(i.cameraX,i.cameraY,i.cameraZ),n),n}function ee(){const n=a.identity(),u=G.fromValues(i.objectScale,i.objectScale,i.objectScale);return a.scale(n,u,n),i.object==="Whale"&&a.rotateY(n,Date.now()/1e3*.5,n),n}const F={colorAttachments:[{view:{texture:{context:{canvasId:o.id}}},clearValue:[.3,.3,.3,1],loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:{texture:g},depthLoadOp:"clear",depthClearValue:1,depthStoreOp:"store"}};o.id;const I=(n,u)=>{const p=a.identity();a.rotateZ(p,u,n[0]),a.translate(n[0],G.create(4,0,0),p),a.rotateZ(p,u,n[1]),a.translate(n[1],G.create(4,0,0),p),a.rotateZ(p,u,n[2])},te=n=>{const u=[],p=[];for(let y=0;y<n;y++)u.push(a.identity()),p.push(a.identity());I(p,0);const h=p.map(y=>a.inverse(y));return{transforms:u,bindPoses:p,bindPosesInv:h}},L=k(j),N=L.writeBuffers||[],U=te(5);for(let n=0;n<U.bindPosesInv.length;n++)N.push({bufferOffset:n*64,data:U.bindPosesInv[n]});O(L).writeBuffers=N;const A=new Map,re=(n,u)=>{for(let p=0;p<n.joints.length;p++){const h=n.joints[p];A.has(h)||A.set(h,c.nodes[h].source.getMatrix());const y=A.get(h);let _=a.create();h===1||h===0?_=a.rotateY(y,-u):h===3||h===4?_=a.rotateX(y,h===3?u:-u):_=a.rotateZ(y,u),c.nodes[h].source.position=a.getTranslation(_),c.nodes[h].source.scale=a.getScaling(_),c.nodes[h].source.rotation=ae.fromMat(_)}},P=[],ie={commandEncoders:[{passEncoders:P}]},ne=(()=>{const n=[],u={...M,...f};for(const h of c.scenes)h.root.renderDrawables(n,u);return{descriptor:F,renderPassObjects:n}})(),se=(()=>{const n={pipeline:V,bindingResources:{...M,...f,...S},vertices:w.vertices,indices:w.indices,draw:{__type__:"DrawIndexed",indexCount:J.length}};return{descriptor:F,renderPassObjects:[n]}})();function D(){const n=Q(),u=K(),p=ee(),h=Date.now()/2e4*i.speed,y=Math.sin(h)*i.angle;I(U.transforms,y);const _=k(v),C=_.writeBuffers||[];C.push({bufferOffset:0,data:n.buffer,dataOffset:n.byteOffset,size:n.byteLength}),C.push({bufferOffset:64,data:u.buffer,dataOffset:u.byteOffset,size:u.byteLength}),C.push({bufferOffset:128,data:p.buffer,dataOffset:p.byteOffset,size:p.byteLength}),O(_).writeBuffers=C;const W=k(x),$=W.writeBuffers||[];for(let T=0;T<U.transforms.length;T++)$.push({bufferOffset:T*64,data:U.transforms[T]});O(W).writeBuffers=$;for(const T of c.scenes)T.root.updateWorldMatrix();re(c.skins[0],Math.sin(h)*i.angle),c.skins[0].update(6,c.nodes),P.length=0,i.object==="Whale"?P.push(ne):P.push(se),l.submit(ie),requestAnimationFrame(D)}requestAnimationFrame(D)},Ue=new oe({width:310}),Ge=document.getElementById("webgpu");Se(Ge,Ue);
