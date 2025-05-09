import"../../../modulepreload-polyfill-3cfb730f.js";import{G as A}from"../../../dat.gui.module-5ea4ba08.js";import{f as y}from"../../../fullscreenTexturedQuad-007c8036.js";import{W,g as m,r as L}from"../../../Buffer-5212487c.js";const M=`struct Params {
  filterDim: i32,
  blockDim: u32,
}

@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var<uniform> params : Params;
@group(1) @binding(1) var inputTex : texture_2d<f32>;
@group(1) @binding(2) var outputTex : texture_storage_2d<rgba8unorm, write>;

struct Flip {
  value: u32,
}
@group(1) @binding(3) var<uniform> flip : Flip;

// This shader blurs the input texture in one direction, depending on whether
// |flip.value| is 0 or 1.
// It does so by running (128 / 4) threads per workgroup to load 128
// texels into 4 rows of shared memory. Each thread loads a
// 4 x 4 block of texels to take advantage of the texture sampling
// hardware.
// Then, each thread computes the blur result by averaging the adjacent texel values
// in shared memory.
// Because we're operating on a subset of the texture, we cannot compute all of the
// results since not all of the neighbors are available in shared memory.
// Specifically, with 128 x 128 tiles, we can only compute and write out
// square blocks of size 128 - (filterSize - 1). We compute the number of blocks
// needed in Javascript and dispatch that amount.

var<workgroup> tile : array<array<vec3<f32>, 128>, 4>;

@compute @workgroup_size(32, 1, 1)
fn main(
    @builtin(workgroup_id) WorkGroupID: vec3<u32>,
    @builtin(local_invocation_id) LocalInvocationID: vec3<u32>
) {
    let filterOffset = (params.filterDim - 1) / 2;
    let dims = vec2<i32>(textureDimensions(inputTex, 0));
    let baseIndex = vec2<i32>(WorkGroupID.xy * vec2<u32>(params.blockDim, 4u) + LocalInvocationID.xy * vec2<u32>(4u, 1u)) - vec2(filterOffset, 0);

    for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
            var loadIndex = baseIndex + vec2(c, r);
            if flip.value != 0u {
                loadIndex = loadIndex.yx;
            }

            tile[r][4u * LocalInvocationID.x + u32(c)] = textureSampleLevel(
                inputTex,
                samp,
                (vec2<f32>(loadIndex) + vec2<f32>(0.25, 0.25)) / vec2<f32>(dims),
                0.0
            ).rgb;
        }
    }

    workgroupBarrier();

    for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
            var writeIndex = baseIndex + vec2(c, r);
            if flip.value != 0u {
                writeIndex = writeIndex.yx;
            }

            let center = i32(4u * LocalInvocationID.x) + c;
            if center >= filterOffset && center < 128 - filterOffset && all(writeIndex < dims) {
                var acc = vec3(0.0, 0.0, 0.0);
                for (var f = 0; f < params.filterDim; f++) {
                    var i = center + f - filterOffset;
                    acc = acc + (1.0 / f32(params.filterDim)) * tile[r][i];
                }
                textureStore(outputTex, writeIndex, vec4(acc, 1.0));
            }
        }
    }
}
`,V=128,p=[4,4],j=async(i,g)=>{const x=window.devicePixelRatio||1;i.width=i.clientWidth*x,i.height=i.clientHeight*x;const T=await new W().init(),u={compute:{code:M}},D={vertex:{code:y},fragment:{code:y}},w={magFilter:"linear",minFilter:"linear"},l=document.createElement("img");l.src=new URL("../../../assets/img/Di-3d.png",self.location).toString(),await l.decode();const o=await createImageBitmap(l),[n,a]=[o.width,o.height],P={size:[o.width,o.height],format:"rgba8unorm",sources:[{image:o}]},t=[0,1].map(()=>({size:[n,a],format:"rgba8unorm",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING})),b=new Uint32Array([0]),C=new Uint32Array([1]),c=new Uint8Array(8),d={samp:w,params:{bufferView:c}},G={inputTex:{texture:P},outputTex:{texture:t[0]},flip:{bufferView:b}},_={inputTex:{texture:t[0]},outputTex:{texture:t[1]},flip:{bufferView:C}},B={inputTex:{texture:t[1]},outputTex:{texture:t[0]},flip:{bufferView:b}},S={mySampler:w,myTexture:{texture:t[1]}},r={filterSize:15,iterations:2};let f=!0,e;const h=()=>{e=V-(r.filterSize-1),m(c).writeBuffers?m(c).writeBuffers.push({data:new Uint32Array([r.filterSize,e])}):L(m(c)).writeBuffers=[{data:new Uint32Array([r.filterSize,e])}],f=!0};g.add(r,"filterSize",1,33).step(2).onChange(h),g.add(r,"iterations",1,10).step(1).onChange(()=>{f=!0}),h();const U={descriptor:{colorAttachments:[{view:{texture:{context:{canvasId:i.id}}},clearValue:[0,0,0,1]}]},renderPassObjects:[{pipeline:D,bindingResources:S,draw:{__type__:"DrawVertex",vertexCount:6,instanceCount:1,firstVertex:0,firstInstance:0}}]},s={__type__:"ComputePass",computeObjects:[]},R={commandEncoders:[{passEncoders:[s,U]}]},E={...d,...G},v={...d,..._},O={...d,...B};function z(){if(s){s.computeObjects=[{pipeline:u,bindingResources:E,workgroups:{workgroupCountX:Math.ceil(n/e),workgroupCountY:Math.ceil(a/p[1])}},{pipeline:u,bindingResources:v,workgroups:{workgroupCountX:Math.ceil(a/e),workgroupCountY:Math.ceil(n/p[1])}}];for(let k=0;k<r.iterations-1;++k)s.computeObjects.push({pipeline:u,bindingResources:O,workgroups:{workgroupCountX:Math.ceil(n/e),workgroupCountY:Math.ceil(a/p[1])}}),s.computeObjects.push({pipeline:u,bindingResources:v,workgroups:{workgroupCountX:Math.ceil(a/e),workgroupCountY:Math.ceil(n/p[1])}})}}function I(){f&&z(),T.submit(R),requestAnimationFrame(I)}requestAnimationFrame(I)},F=new A({width:310}),X=document.getElementById("webgpu");j(X,F);
