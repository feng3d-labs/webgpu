import"../../../modulepreload-polyfill-3cfb730f.js";import{r as k,W as he,g as T}from"../../../Buffer-5212487c.js";import{G as _e}from"../../../dat.gui.module-5ea4ba08.js";const ve=`@group(0) @binding(3) var<storage, read_write> counter: atomic<u32>;

@compute @workgroup_size(1, 1, 1)
fn atomicToZero() {
  let counterValue = atomicLoad(&counter);
  atomicSub(&counter, counterValue);
}
`,j=n=>((n%2!==0||n>256)&&(n=256),`

struct Uniforms {
  width: f32,
  height: f32,
  algo: u32,
  blockHeight: u32,
}

// Create local workgroup data that can contain all elements
var<workgroup> local_data: array<u32, ${n*2}>;

// Define groups (functions refer to this data)
@group(0) @binding(0) var<storage, read> input_data: array<u32>;
@group(0) @binding(1) var<storage, read_write> output_data: array<u32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;
@group(0) @binding(3) var<storage, read_write> counter: atomic<u32>;

// Compare and swap values in local_data
fn local_compare_and_swap(idx_before: u32, idx_after: u32) {
  //idx_before should always be < idx_after
  if (local_data[idx_after] < local_data[idx_before]) {
    atomicAdd(&counter, 1);
    var temp: u32 = local_data[idx_before];
    local_data[idx_before] = local_data[idx_after];
    local_data[idx_after] = temp;
  }
  return;
}

// invoke_id goes from 0 to workgroupSize
fn get_flip_indices(invoke_id: u32, block_height: u32) -> vec2u {
  // Caculate index offset (i.e move indices into correct block)
  let block_offset: u32 = ((2 * invoke_id) / block_height) * block_height;
  let half_height = block_height / 2;
  // Calculate index spacing
  var idx: vec2u = vec2u(
    invoke_id % half_height, block_height - (invoke_id % half_height) - 1,
  );
  idx.x += block_offset;
  idx.y += block_offset;
  return idx;
}

fn get_disperse_indices(invoke_id: u32, block_height: u32) -> vec2u {
  var block_offset: u32 = ((2 * invoke_id) / block_height) * block_height;
  let half_height = block_height / 2;
	var idx: vec2u = vec2u(
    invoke_id % half_height, (invoke_id % half_height) + half_height
  );
  idx.x += block_offset;
  idx.y += block_offset;
  return idx;
}

fn global_compare_and_swap(idx_before: u32, idx_after: u32) {
  if (input_data[idx_after] < input_data[idx_before]) {
    output_data[idx_before] = input_data[idx_after];
    output_data[idx_after] = input_data[idx_before];
  } 
}

// Constants/enum
const ALGO_NONE = 0;
const ALGO_LOCAL_FLIP = 1;
const ALGO_LOCAL_DISPERSE = 2;
const ALGO_GLOBAL_FLIP = 3;

// Our compute shader will execute specified # of invocations or elements / 2 invocations
@compute @workgroup_size(${n}, 1, 1)
fn computeMain(
  @builtin(global_invocation_id) global_id: vec3u,
  @builtin(local_invocation_id) local_id: vec3u,
  @builtin(workgroup_id) workgroup_id: vec3u,
) {

  let offset = ${n} * 2 * workgroup_id.x;
  // If we will perform a local swap, then populate the local data
  if (uniforms.algo <= 2) {
    // Assign range of input_data to local_data.
    // Range cannot exceed maxWorkgroupsX * 2
    // Each invocation will populate the workgroup data... (1 invocation for every 2 elements)
    local_data[local_id.x * 2] = input_data[offset + local_id.x * 2];
    local_data[local_id.x * 2 + 1] = input_data[offset + local_id.x * 2 + 1];
  }

  //...and wait for each other to finish their own bit of data population.
  workgroupBarrier();

  switch uniforms.algo {
    case 1: { // Local Flip
      let idx = get_flip_indices(local_id.x, uniforms.blockHeight);
      local_compare_and_swap(idx.x, idx.y);
    } 
    case 2: { // Local Disperse
      let idx = get_disperse_indices(local_id.x, uniforms.blockHeight);
      local_compare_and_swap(idx.x, idx.y);
    } 
    case 3: { // Global Flip
      let idx = get_flip_indices(global_id.x, uniforms.blockHeight);
      global_compare_and_swap(idx.x, idx.y);
    }
    case 4: { 
      let idx = get_disperse_indices(global_id.x, uniforms.blockHeight);
      global_compare_and_swap(idx.x, idx.y);
    }
    default: { 
      
    }
  }

  // Ensure that all invocations have swapped their own regions of data
  workgroupBarrier();

  if (uniforms.algo <= ALGO_LOCAL_DISPERSE) {
    //Repopulate global data with local data
    output_data[offset + local_id.x * 2] = local_data[local_id.x * 2];
    output_data[offset + local_id.x * 2 + 1] = local_data[local_id.x * 2 + 1];
  }

}`),xe=`struct ComputeUniforms {
  width: f32,
  height: f32,
  algo: u32,
  blockHeight: u32,
}

struct FragmentUniforms {
  // boolean, either 0 or 1
  highlight: u32,
}

struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) fragUV: vec2f
}

// Uniforms from compute shader
@group(0) @binding(0) var<storage, read> data: array<u32>;
@group(0) @binding(2) var<uniform> uniforms: ComputeUniforms;
// Fragment shader uniforms
@group(1) @binding(0) var<uniform> fragment_uniforms: FragmentUniforms;

@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f {
  var uv: vec2f = vec2f(
    input.fragUV.x * uniforms.width,
    input.fragUV.y * uniforms.height
  );

  var pixel: vec2u = vec2u(
    u32(floor(uv.x)),
    u32(floor(uv.y)),
  );
  
  var elementIndex = u32(uniforms.width) * pixel.y + pixel.x;
  var colorChanger = data[elementIndex];

  var subtracter = f32(colorChanger) / (uniforms.width * uniforms.height);

  if (fragment_uniforms.highlight == 1) {
    return select(
      //If element is above halfHeight, highlight green
      vec4f(vec3f(0.0, 1.0 - subtracter, 0.0).rgb, 1.0),
      //If element is below halfheight, highlight red
      vec4f(vec3f(1.0 - subtracter, 0.0, 0.0).rgb, 1.0),
      elementIndex % uniforms.blockHeight < uniforms.blockHeight / 2
    );
  }

  var color: vec3f = vec3f(
    1.0 - subtracter
  );

  return vec4f(color.rgb, 1.0);
}
`,Se=`
struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragUV: vec2<f32>,
}

@vertex
fn vert_main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {
    const pos = array<vec2<f32>, 6>(
        vec2(1.0, 1.0),
        vec2(1.0, -1.0),
        vec2(-1.0, -1.0),
        vec2(1.0, 1.0),
        vec2(-1.0, -1.0),
        vec2(-1.0, 1.0),
    );

    const uv = array<vec2<f32>, 6>(
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(0.0, 0.0),
    );

    var output: VertexOutput;
    output.Position = vec4(pos[VertexIndex], 0.0, 1.0);
    output.fragUV = uv[VertexIndex];
    return output;
}

`;class Ee{executeRun(r,a,l,c){const S={descriptor:a,renderPassObjects:[{pipeline:l,bindingResources:c,draw:{__type__:"DrawVertex",vertexCount:6,instanceCount:1}}]};r.passEncoders.push(S)}create2DRenderPipeline(r,a){return{label:`${r}.pipeline`,vertex:{code:Se},fragment:{code:a},primitive:{topology:"triangle-list",cullFace:"none"}}}}class we extends Ee{constructor(r,a,l){super(),this.renderPassDescriptor=r,this.computeBGDescript=a;const c={highlight:void 0};k(a).fragment_uniforms=c,this.pipeline=super.create2DRenderPipeline(l,xe),this.setArguments=S=>{k(c).highlight=S.highlight}}startRun(r,a){this.setArguments(a),super.executeRun(r,this.renderPassDescriptor,this.pipeline,this.computeBGDescript)}}var ce=(n=>(n[n.NONE=0]="NONE",n[n.FLIP_LOCAL=1]="FLIP_LOCAL",n[n.DISPERSE_LOCAL=2]="DISPERSE_LOCAL",n[n.FLIP_GLOBAL=3]="FLIP_GLOBAL",n[n.DISPERSE_GLOBAL=4]="DISPERSE_GLOBAL",n))(ce||{});const le=n=>{const r=Math.log2(n);return r*(r+1)/2};async function be(n,r){const a=window.devicePixelRatio||1;r.width=r.clientWidth*a,r.height=r.clientHeight*a;const l=await new he().init(),c=l.device.limits.maxComputeWorkgroupSizeX,S={onQuery:t=>{const o=t/1e6,i=e.sortTime+o;if(e.stepTime=o,e.sortTime=i,K.setValue(`${o.toFixed(5)}ms`),q.setValue(`${i.toFixed(5)}ms`),s===e["Total Elements"]*2){s*=2,e.configToCompleteSwapsMap[e.configKey].time+=i;const d=e.configToCompleteSwapsMap[e.configKey].time/e.configToCompleteSwapsMap[e.configKey].sorts;Y.setValue(`${d.toFixed(5)}ms`)}}},A=[],p=c*32;for(let t=p;t>=4;t/=2)A.push(t);const Q=[];for(let t=c;t>=2;t/=2)Q.push(t);const P=Math.sqrt(p)%2===0?Math.floor(Math.sqrt(p)):Math.floor(Math.sqrt(p/2)),Z=p/P,e={"Total Elements":p,"Grid Width":P,"Grid Height":Z,"Grid Dimensions":`${P}x${Z}`,"Workgroup Size":c,"Size Limit":c,"Workgroups Per Step":p/(c*2),"Hovered Cell":0,"Swapped Cell":1,"Step Index":0,"Total Steps":le(p),"Current Step":"0 of 91","Prev Step":"NONE","Next Step":"FLIP_LOCAL","Prev Swap Span":0,"Next Swap Span":2,executeStep:!1,"Randomize Values":()=>{},"Execute Sort Step":()=>{},"Log Elements":()=>{},"Auto Sort":()=>{},"Auto Sort Speed":50,"Display Mode":"Elements","Total Swaps":0,"Step Time":"0ms",stepTime:0,"Sort Time":"0ms",sortTime:0,"Average Sort Time":"0ms",configToCompleteSwapsMap:{"8192 256":{sorts:0,time:0}},configKey:"8192 256"};let u=new Uint32Array(Array.from({length:e["Total Elements"]},(t,o)=>o));const b=Float32Array.BYTES_PER_ELEMENT*A[0],V={bufferView:new Uint8Array(b)},J={bufferView:new Uint8Array(b)},ee={size:b,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST},te={bufferView:new Uint32Array(1)},oe={size:Uint32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST},ne={bufferView:new Float32Array(4)},I={input_data:V,data:V,output_data:J,counter:te,uniforms:ne};let O={compute:{code:j(e["Workgroup Size"])}};const de={compute:{code:ve}},ue={colorAttachments:[{view:{texture:{context:{canvasId:r.id}}},clearValue:[.1,.4,.5,1],loadOp:"clear",storeOp:"store"}]},pe=new we(ue,I,"BitonicDisplay"),B=()=>{e.stepTime=0,e.sortTime=0,K.setValue("0ms"),q.setValue("0ms");const t=e.configToCompleteSwapsMap[e.configKey].time/e.configToCompleteSwapsMap[e.configKey].sorts,o=t||0;Y.setValue(`${o.toFixed(5)}ms`)},ie=()=>{D.setValue(Math.min(e["Total Elements"]/2,e["Size Limit"]));const t=(e["Total Elements"]-1)/(e["Size Limit"]*2);R.setValue(Math.ceil(t)),e["Step Index"]=0,e["Total Steps"]=le(e["Total Elements"]),U.setValue(`${e["Step Index"]} of ${e["Total Steps"]}`);const o=Math.sqrt(e["Total Elements"])%2===0?Math.floor(Math.sqrt(e["Total Elements"])):Math.floor(Math.sqrt(e["Total Elements"]/2)),i=e["Total Elements"]/o;e["Grid Width"]=o,e["Grid Height"]=i,re.setValue(`${o}x${i}`),H.setValue("NONE"),m.setValue("FLIP_LOCAL"),W.setValue(0),x.setValue(2);const d={commandEncoders:[{passEncoders:[{__type__:"ComputePass",computeObjects:[{pipeline:de,bindingResources:I,workgroups:{workgroupCountX:1}}]}]}]};l.submit(d),z.setValue(0),s=2},M=()=>{let t=u.length;for(;t!==0;){const o=Math.floor(Math.random()*t);t-=1,[u[t],u[o]]=[u[o],u[t]]}},fe=()=>{u=new Uint32Array(Array.from({length:e["Total Elements"]},(t,o)=>o)),ie(),O={compute:{code:j(Math.min(e["Total Elements"]/2,e["Size Limit"]))}},M(),s=2};M();const G=()=>{let t;switch(e["Next Step"]){case"FLIP_LOCAL":case"FLIP_GLOBAL":{const o=e["Next Swap Span"],i=Math.floor(e["Hovered Cell"]/o)+1,d=e["Hovered Cell"]%o;t=o*i-d-1,w.setValue(t)}break;case"DISPERSE_LOCAL":{const o=e["Next Swap Span"],i=o/2;t=e["Hovered Cell"]%o<i?e["Hovered Cell"]+i:e["Hovered Cell"]-i,w.setValue(t)}break;case"NONE":t=e["Hovered Cell"],w.setValue(t);default:t=e["Hovered Cell"],w.setValue(t);break}};let f=null;const N=()=>{f!==null&&(clearInterval(f),f=null)},F=()=>{const t=e["Auto Sort Speed"];f=setInterval(()=>{e["Next Step"]==="NONE"&&(clearInterval(f),f=null,h.domElement.style.pointerEvents="auto"),e["Auto Sort Speed"]!==t&&(clearInterval(f),f=null,F()),e.executeStep=!0,G()},e["Auto Sort Speed"])},E=n.addFolder("Compute Resources");E.add(e,"Total Elements",A).onChange(()=>{N(),fe(),h.domElement.style.pointerEvents="auto";const t=`${e["Total Elements"]} ${e["Size Limit"]}`;e.configToCompleteSwapsMap[t]||(e.configToCompleteSwapsMap[t]={sorts:0,time:0}),e.configKey=t,B()});const h=E.add(e,"Size Limit",Q).onChange(()=>{const t=Math.min(e["Total Elements"]/2,e["Size Limit"]),o=(e["Total Elements"]-1)/(e["Size Limit"]*2);D.setValue(t),R.setValue(Math.ceil(o)),O={compute:{code:j(Math.min(e["Total Elements"]/2,e["Size Limit"]))}};const i=`${e["Total Elements"]} ${e["Size Limit"]}`;e.configToCompleteSwapsMap[i]||(e.configToCompleteSwapsMap[i]={sorts:0,time:0}),e.configKey=i,B()}),D=E.add(e,"Workgroup Size"),R=E.add(e,"Workgroups Per Step");E.open();const _=n.addFolder("Sort Controls");_.add(e,"Execute Sort Step").onChange(()=>{h.domElement.style.pointerEvents="none",N(),e.executeStep=!0}),_.add(e,"Randomize Values").onChange(()=>{N(),M(),ie(),B(),h.domElement.style.pointerEvents="auto"}),_.add(e,"Log Elements").onChange(()=>console.log(u)),_.add(e,"Auto Sort").onChange(()=>{h.domElement.style.pointerEvents="none",F()}),_.add(e,"Auto Sort Speed",50,1e3).step(50),_.open();const C=n.addFolder("Grid Information");C.add(e,"Display Mode",["Elements","Swap Highlight"]);const re=C.add(e,"Grid Dimensions"),ae=C.add(e,"Hovered Cell").onChange(G),w=C.add(e,"Swapped Cell"),v=n.addFolder("Execution Information"),U=v.add(e,"Current Step"),H=v.add(e,"Prev Step"),m=v.add(e,"Next Step"),z=v.add(e,"Total Swaps"),W=v.add(e,"Prev Swap Span"),x=v.add(e,"Next Swap Span"),$=n.addFolder("Timestamp Info (Chrome 121+)"),K=$.add(e,"Step Time"),q=$.add(e,"Sort Time"),Y=$.add(e,"Average Sort Time"),y=document.getElementsByClassName("cr function");for(let t=0;t<y.length;t++)y[t].children[0].style.display="flex",y[t].children[0].style.justifyContent="center",y[t].children[0].children[1].style.position="absolute";r.addEventListener("mousemove",t=>{const o=r.getBoundingClientRect().width,i=r.getBoundingClientRect().height,d=[o/e["Grid Width"],i/e["Grid Height"]],g=Math.floor(t.offsetX/d[0]),L=e["Grid Height"]-1-Math.floor(t.offsetY/d[1]);ae.setValue(L*e["Grid Width"]+g),e["Hovered Cell"]=L*e["Grid Width"]+g}),h.domElement.style.pointerEvents="none",R.domElement.style.pointerEvents="none",ae.domElement.style.pointerEvents="none",w.domElement.style.pointerEvents="none",U.domElement.style.pointerEvents="none",H.domElement.style.pointerEvents="none",W.domElement.style.pointerEvents="none",m.domElement.style.pointerEvents="none",x.domElement.style.pointerEvents="none",D.domElement.style.pointerEvents="none",re.domElement.style.pointerEvents="none",z.domElement.style.pointerEvents="none",K.domElement.style.pointerEvents="none",q.domElement.style.pointerEvents="none",Y.domElement.style.pointerEvents="none",n.width=325;let s=2;F();async function se(){let t=T(V.bufferView),o=t.writeBuffers||[];o.push({data:u}),k(t).writeBuffers=o;const i=new Float32Array([e["Grid Width"],e["Grid Height"]]),d=new Uint32Array([ce[e["Next Step"]],e["Next Swap Span"]]);t=T(ne.bufferView),o=t.writeBuffers||[],o.push({data:i}),o.push({bufferOffset:8,data:d}),k(t).writeBuffers=o;const g={passEncoders:[]},L={commandEncoders:[g]};if(pe.startRun(g,{highlight:e["Display Mode"]==="Elements"?0:1}),e.executeStep&&s<e["Total Elements"]*2){const X={__type__:"ComputePass",descriptor:{timestampQuery:S},computeObjects:[{pipeline:O,bindingResources:I,workgroups:{workgroupCountX:e["Workgroups Per Step"]}}]};g.passEncoders.push(X),e["Step Index"]=e["Step Index"]+1,U.setValue(`${e["Step Index"]} of ${e["Total Steps"]}`),H.setValue(e["Next Step"]),W.setValue(e["Next Swap Span"]),x.setValue(e["Next Swap Span"]/2),e["Next Swap Span"]===1?(s*=2,s===e["Total Elements"]*2?(m.setValue("NONE"),x.setValue(0),e.configToCompleteSwapsMap[e.configKey].sorts+=1):s>e["Workgroup Size"]*2?(m.setValue("FLIP_GLOBAL"),x.setValue(s)):(m.setValue("FLIP_LOCAL"),x.setValue(s))):e["Next Swap Span"]>e["Workgroup Size"]*2?m.setValue("DISPERSE_GLOBAL"):m.setValue("DISPERSE_LOCAL"),g.passEncoders.push({__type__:"CopyBufferToBuffer",source:T(J.bufferView),sourceOffset:0,destination:ee,destinationOffset:0,size:b},{__type__:"CopyBufferToBuffer",source:T(te.bufferView),sourceOffset:0,destination:oe,destinationOffset:0,size:Uint32Array.BYTES_PER_ELEMENT})}if(l.submit(L),e.executeStep&&s<e["Total Elements"]*4){const X=await l.readBuffer(ee,0,Uint32Array.BYTES_PER_ELEMENT*e["Total Elements"]),me=await l.readBuffer(oe,0,Uint32Array.BYTES_PER_ELEMENT),ge=new Uint32Array(X);z.setValue(new Uint32Array(me)[0]),u=ge,G()}e.executeStep=!1,requestAnimationFrame(se)}requestAnimationFrame(se)}const Ce=document.getElementById("webgpu"),ye=new _e;be(ye,Ce);
