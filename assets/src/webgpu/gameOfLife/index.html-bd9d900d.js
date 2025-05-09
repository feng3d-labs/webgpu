import"../../../modulepreload-polyfill-3cfb730f.js";import{G}from"../../../dat.gui.module-5ea4ba08.js";import{W as V}from"../../../Buffer-5212487c.js";const E=`@binding(0) @group(0) var<storage, read> size: vec2<u32>;
@binding(1) @group(0) var<storage, read> current: array<u32>;
@binding(2) @group(0) var<storage, read_write> next: array<u32>;

override blockSize = 8;

fn getIndex(x: u32, y: u32) -> u32 {
    let h = size.y;
    let w = size.x;

    return (y % h) * w + (x % w);
}

fn getCell(x: u32, y: u32) -> u32 {
    return current[getIndex(x, y)];
}

fn countNeighbors(x: u32, y: u32) -> u32 {
    return getCell(x - 1u, y - 1u) + getCell(x, y - 1u) + getCell(x + 1u, y - 1u) + //
         getCell(x - 1u, y) + getCell(x + 1u, y) + //
         getCell(x - 1u, y + 1u) + getCell(x, y + 1u) + getCell(x + 1u, y + 1u);//
}

@compute @workgroup_size(blockSize, blockSize)
fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
    let x = grid.x;
    let y = grid.y;
    let n = countNeighbors(x, y);
    next[getIndex(x, y)] = select(u32(n == 3u), u32(n == 2u || n == 3u), getCell(x, y) == 1u);
} 
`,P=`@fragment
fn main(@location(0) cell: f32) -> @location(0) vec4<f32> {
    return vec4<f32>(cell, cell, cell, 1.);
}
`,A=`struct Out {
  @builtin(position) pos: vec4<f32>,
  @location(0) cell: f32,
}

@binding(0) @group(0) var<uniform> size: vec2<u32>;

@vertex
fn main(@builtin(instance_index) i: u32, @location(0) cell: u32, @location(1) pos: vec2<u32>) -> Out {
    let w = size.x;
    let h = size.y;
    let x = (f32(i % w + pos.x) / f32(w) - 0.5) * 2. * f32(w) / f32(max(w, h));
    let y = (f32((i - (i % w)) / w + pos.y) / f32(h) - 0.5) * 2. * f32(h) / f32(max(w, h));

    return Out(vec4<f32>(x, y, 0., 1.), f32(cell));
}
`,U=async(i,n)=>{const g=window.devicePixelRatio||1;i.width=i.clientWidth*g,i.height=i.clientHeight*g;const b=await new V().init(),e={width:128,height:128,timestep:4,workgroupSize:8},y={pos:{data:new Uint32Array([0,0,0,1,1,0,1,1]),format:"uint32x2"}};function v(){n.add(e,"timestep",1,60,1),n.add(e,"width",16,1024,16).onFinishChange(s),n.add(e,"height",16,1024,16).onFinishChange(s),n.add(e,"workgroupSize",[4,8,16]).onFinishChange(s)}let c=0,r=0,o,p,u,w,m;function s(){const l={compute:{code:E,constants:{blockSize:e.workgroupSize}}},a=new Uint32Array([e.width,e.height]),f=e.width*e.height,d=new Uint32Array(f);for(let t=0;t<f;t++)d[t]=Math.random()<.25?1:0;o=d,p={cell:{data:o,format:"uint32",stepMode:"instance"}},u=new Uint32Array(d.byteLength),w={cell:{data:u,format:"uint32",stepMode:"instance"}};const z={size:{bufferView:a},current:{bufferView:o},next:{bufferView:u}},C={size:{bufferView:a},current:{bufferView:u},next:{bufferView:o}},_={vertex:{code:A},fragment:{code:P},primitive:{topology:"triangle-strip"}},S={size:{bufferView:a,offset:0,size:2*Uint32Array.BYTES_PER_ELEMENT}},k={colorAttachments:[{view:{texture:{context:{canvasId:i.id}}}}]},x=[];for(let t=0;t<2;t++){const h={};Object.assign(h,t?w:p,y),x[t]=[{__type__:"ComputePass",computeObjects:[{pipeline:l,bindingResources:t?C:z,workgroups:{workgroupCountX:e.width/e.workgroupSize,workgroupCountY:e.height/e.workgroupSize}}]},{descriptor:k,renderPassObjects:[{pipeline:_,bindingResources:S,vertices:h,draw:{__type__:"DrawVertex",vertexCount:4,instanceCount:f}}]}]}r=0,m=()=>{const t={commandEncoders:[{passEncoders:x[r]}]};b.submit(t)}}v(),s(),function l(){e.timestep&&(c++,c>=e.timestep&&(m(),c-=e.timestep,r=1-r)),requestAnimationFrame(l)}()},B=new G({width:310}),I=document.getElementById("webgpu");U(I,B);
