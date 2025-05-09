import"../../../modulepreload-polyfill-3cfb730f.js";import{G as Y}from"../../../dat.gui.module-5ea4ba08.js";import{m as a,v as N}from"../../../wgpu-matrix.module-82499b8f.js";import{W as $,r as v,g as _}from"../../../Buffer-5212487c.js";const J=`struct UBO {
  width: u32,
}

struct Buffer {
  weights: array<f32>,
}

@binding(0) @group(0) var<uniform> ubo : UBO;
@binding(1) @group(0) var<storage, read> buf_in : Buffer;
@binding(2) @group(0) var<storage, read_write> buf_out : Buffer;
@binding(3) @group(0) var tex_in : texture_2d<f32>;

////////////////////////////////////////////////////////////////////////////////
// import_level
//
// Loads the alpha channel from a texel of the source image, and writes it to
// the buf_out.weights.
////////////////////////////////////////////////////////////////////////////////
@compute @workgroup_size(64)
fn import_level(@builtin(global_invocation_id) coord: vec3<u32>) {
    _ = &buf_in;
    let offset = coord.x + coord.y * ubo.width;
    buf_out.weights[offset] = textureLoad(tex_in, vec2<i32>(coord.xy), 0).w;
}
`,A=`////////////////////////////////////////////////////////////////////////////////
// Vertex shader
////////////////////////////////////////////////////////////////////////////////
struct RenderParams {
  modelViewProjectionMatrix: mat4x4<f32>,
  right: vec3<f32>,
  up: vec3<f32>
}
@binding(0) @group(0) var<uniform> render_params : RenderParams;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) color: vec4<f32>,
  @location(2) quad_pos: vec2<f32>, // -1..+1
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) quad_pos: vec2<f32>, // -1..+1
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var quad_pos = mat2x3<f32>(render_params.right, render_params.up) * in.quad_pos;
    var position = in.position + quad_pos * 0.01;
    var out: VertexOutput;
    out.position = render_params.modelViewProjectionMatrix * vec4<f32>(position, 1.0);
    out.color = in.color;
    out.quad_pos = in.quad_pos;
    return out;
}

////////////////////////////////////////////////////////////////////////////////
// Fragment shader
////////////////////////////////////////////////////////////////////////////////
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    var color = in.color;
  // Apply a circular particle alpha mask
    color.a = color.a * max(1.0 - length(in.quad_pos), 0.0);
    return color;
}
`,K=`struct UBO {
  width: u32,
}

struct Buffer {
  weights: array<f32>,
}

@binding(0) @group(0) var<uniform> ubo : UBO;
@binding(1) @group(0) var<storage, read> buf_in : Buffer;
@binding(2) @group(0) var<storage, read_write> buf_out : Buffer;
@binding(3) @group(0) var tex_out : texture_storage_2d<rgba8unorm, write>;


////////////////////////////////////////////////////////////////////////////////
// export_level
//
// Loads 4 f32 weight values from buf_in.weights, and stores summed value into
// buf_out.weights, along with the calculated 'probabilty' vec4 values into the
// mip level of tex_out. See simulate() in particle.wgsl to understand the
// probability logic.
////////////////////////////////////////////////////////////////////////////////
@compute @workgroup_size(64)
fn export_level(@builtin(global_invocation_id) coord: vec3<u32>) {
    if all(coord.xy < vec2<u32>(textureDimensions(tex_out))) {
        let dst_offset = coord.x + coord.y * ubo.width;
        let src_offset = coord.x * 2u + coord.y * 2u * ubo.width;

        let a = buf_in.weights[src_offset + 0u];
        let b = buf_in.weights[src_offset + 1u];
        let c = buf_in.weights[src_offset + 0u + ubo.width];
        let d = buf_in.weights[src_offset + 1u + ubo.width];
        let sum = dot(vec4<f32>(a, b, c, d), vec4<f32>(1.0));

        buf_out.weights[dst_offset] = sum / 4.0;

        let probabilities = vec4<f32>(a, a + b, a + b + c, sum) / max(sum, 0.0001);
        textureStore(tex_out, vec2<i32>(coord.xy), probabilities);
    }
}
`,Q=`////////////////////////////////////////////////////////////////////////////////
// Utilities
////////////////////////////////////////////////////////////////////////////////
var<private> rand_seed : vec2<f32>;

fn init_rand(invocation_id: u32, seed: vec4<f32>) {
    rand_seed = seed.xz;
    rand_seed = fract(rand_seed * cos(35.456 + f32(invocation_id) * seed.yw));
    rand_seed = fract(rand_seed * cos(41.235 + f32(invocation_id) * seed.xw));
}

fn rand() -> f32 {
    rand_seed.x = fract(cos(dot(rand_seed, vec2<f32>(23.14077926, 232.61690225))) * 136.8168);
    rand_seed.y = fract(cos(dot(rand_seed, vec2<f32>(54.47856553, 345.84153136))) * 534.7645);
    return rand_seed.y;
}

////////////////////////////////////////////////////////////////////////////////
// Simulation Compute shader
////////////////////////////////////////////////////////////////////////////////
struct SimulationParams {
  deltaTime: f32,
  seed: vec4<f32>,
}

struct Particle {
  position: vec3<f32>,
  lifetime: f32,
  color: vec4<f32>,
  velocity: vec3<f32>,
}

struct Particles {
  particles: array<Particle>,
}

@binding(0) @group(0) var<uniform> sim_params : SimulationParams;
@binding(1) @group(0) var<storage, read_write> data : Particles;
@binding(2) @group(0) var texture : texture_2d<f32>;

@compute @workgroup_size(64)
fn simulate(@builtin(global_invocation_id) global_invocation_id: vec3<u32>) {
    let idx = global_invocation_id.x;

    init_rand(idx, sim_params.seed);

    var particle = data.particles[idx];

    // Apply gravity
    particle.velocity.z = particle.velocity.z - sim_params.deltaTime * 0.5;

    // Basic velocity integration
    particle.position = particle.position + sim_params.deltaTime * particle.velocity;

    // Age each particle. Fade out before vanishing.
    particle.lifetime = particle.lifetime - sim_params.deltaTime;
    particle.color.a = smoothstep(0.0, 0.5, particle.lifetime);

    // If the lifetime has gone negative, then the particle is dead and should be
    // respawned.
    if particle.lifetime < 0.0 {
        // Use the probability map to find where the particle should be spawned.
        // Starting with the 1x1 mip level.
        var coord: vec2<i32>;
        for (var level = textureNumLevels(texture) - 1; level > 0; level--) {
            // Load the probability value from the mip-level
            // Generate a random number and using the probabilty values, pick the
            // next texel in the next largest mip level:
            //
            // 0.0    probabilites.r    probabilites.g    probabilites.b   1.0
            //  |              |              |              |              |
            //  |   TOP-LEFT   |  TOP-RIGHT   | BOTTOM-LEFT  | BOTTOM_RIGHT |
            //
            let probabilites = textureLoad(texture, coord, level);
            let value = vec4<f32>(rand());
            let mask = (value >= vec4<f32>(0.0, probabilites.xyz)) & (value < probabilites);
            coord = coord * 2;
            coord.x = coord.x + select(0, 1, any(mask.yw)); // x  y
            coord.y = coord.y + select(0, 1, any(mask.zw)); // z  w
        }
        let uv = vec2<f32>(coord) / vec2<f32>(textureDimensions(texture));
        particle.position = vec3<f32>((uv - 0.5) * 3.0 * vec2<f32>(1.0, -1.0), 0.0);
        particle.color = textureLoad(texture, coord, 0);
        particle.velocity.x = (rand() - 0.5) * 0.1;
        particle.velocity.y = (rand() - 0.5) * 0.1;
        particle.velocity.z = rand() * 0.3;
        particle.lifetime = 0.5 + rand() * 3.0;
    }

    // Store the new particle value
    data.particles[idx] = particle;
}
`,d=5e4,Z=0,ee=4*4,p=3*4+1*4+4*4+3*4+1*4+0,te=async(o,U)=>{const g=window.devicePixelRatio||1;o.width=o.clientWidth*g,o.height=o.clientHeight*g;const h=await new $().init(),f=new Float32Array(d*p/4),k={position:{data:f,format:"float32x3",offset:Z,arrayStride:p,stepMode:"instance"},color:{data:f,format:"float32x4",offset:ee,arrayStride:p,stepMode:"instance"}},z={vertex:{code:A},fragment:{code:A,targets:[{blend:{color:{srcFactor:"src-alpha",dstFactor:"one",operation:"add"},alpha:{srcFactor:"zero",dstFactor:"one",operation:"add"}}}]},depthStencil:{depthWriteEnabled:!1}},C=4*4*4+3*4+4+3*4+4+0,w=new Uint8Array(C),T={render_params:{bufferView:w}},I={colorAttachments:[{view:{texture:{context:{canvasId:o.id}}},clearValue:[0,0,0,1]}],depthStencilAttachment:{depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},q=[-1,-1,1,-1,-1,1,-1,1,1,-1,1,1],F={quad_pos:{data:new Float32Array(q),format:"float32x2"}};let u,n=1,s=1,m=1;{const c=await fetch(new URL("../../../assets/img/webgpu.png",self.location).toString()),i=await createImageBitmap(await c.blob());for(;n<i.width||s<i.height;)n*=2,s*=2,m++;u={size:[i.width,i.height],mipLevelCount:m,format:"rgba8unorm",sources:[{image:i}]}}{const c={compute:{code:J}},i={compute:{code:K}},H=1*4+3*4+0,P=new Uint8Array(H),O=new Uint8Array(n*s*4),L=new Uint8Array(n*s*4);v(_(P)).writeBuffers=[{data:new Int32Array([n])}];const b=[],X={commandEncoders:[{passEncoders:b}]};for(let r=0;r<m;r++){const M=n>>r,V=s>>r,S={ubo:{bufferView:P},buf_in:{bufferView:r&1?O:L},buf_out:{bufferView:r&1?L:O},tex_in:{texture:u,format:"rgba8unorm",dimension:"2d",baseMipLevel:r,mipLevelCount:1},tex_out:{texture:u,format:"rgba8unorm",dimension:"2d",baseMipLevel:r,mipLevelCount:1}};r===0?b.push({__type__:"ComputePass",computeObjects:[{pipeline:c,bindingResources:{...S},workgroups:{workgroupCountX:Math.ceil(M/64),workgroupCountY:V}}]}):b.push({__type__:"ComputePass",computeObjects:[{pipeline:i,bindingResources:{...S},workgroups:{workgroupCountX:Math.ceil(M/64),workgroupCountY:V}}]})}h.submit(X)}const l={simulate:!0,deltaTime:.04},G=1*4+3*4+4*4+0,x=new Uint8Array(G);Object.keys(l).forEach(c=>{U.add(l,c)});const E={compute:{code:Q}},R={sim_params:{bufferView:x},data:{bufferView:f,offset:0,size:d*p},texture:{texture:u}},W=o.width/o.height,j=a.perspective(2*Math.PI/5,W,1,100),t=a.create(),e=a.create(),y=[],D={commandEncoders:[{passEncoders:y}]};y.push({__type__:"ComputePass",computeObjects:[{pipeline:E,bindingResources:{...R},workgroups:{workgroupCountX:Math.ceil(d/64)}}]},{descriptor:I,renderPassObjects:[{pipeline:z,bindingResources:{...T},vertices:{...k,...F},draw:{__type__:"DrawVertex",vertexCount:6,instanceCount:d,firstVertex:0,firstInstance:0}}]});function B(){v(_(x)).writeBuffers=[{data:new Float32Array([l.simulate?l.deltaTime:0,0,0,0,Math.random()*100,Math.random()*100,1+Math.random(),1+Math.random()])}],a.identity(t),a.translate(t,N.fromValues(0,0,-3),t),a.rotateX(t,Math.PI*-.2,t),a.multiply(j,t,e),v(_(w)).writeBuffers=[{data:new Float32Array([e[0],e[1],e[2],e[3],e[4],e[5],e[6],e[7],e[8],e[9],e[10],e[11],e[12],e[13],e[14],e[15],t[0],t[4],t[8],0,t[1],t[5],t[9],0])}],h.submit(D),requestAnimationFrame(B)}requestAnimationFrame(B)},re=new Y({width:310}),oe=document.getElementById("webgpu");te(oe,re);
