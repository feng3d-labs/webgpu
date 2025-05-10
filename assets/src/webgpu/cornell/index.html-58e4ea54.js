import"../../../modulepreload-polyfill-3cfb730f.js";import{G as L}from"../../../dat.gui.module-5ea4ba08.js";import{r as V,g as M,W as E}from"../../../Buffer-23ffa079.js";import{m as x,v as o}from"../../../wgpu-matrix.module-82499b8f.js";const G=`const pi = 3.14159265359;

// Quad describes 2D rectangle on a plane
struct Quad {
  // The surface plane
  plane: vec4<f32>,
  // A plane with a normal in the 'u' direction, intersecting the origin, at
  // right-angles to the surface plane.
  // The dot product of 'right' with a 'vec4(pos, 1)' will range between [-1..1]
  // if the projected point is within the quad.
  right: vec4<f32>,
  // A plane with a normal in the 'v' direction, intersecting the origin, at
  // right-angles to the surface plane.
  // The dot product of 'up' with a 'vec4(pos, 1)' will range between [-1..1]
  // if the projected point is within the quad.
  up: vec4<f32>,
  // The diffuse color of the quad
  color: vec3<f32>,
  // Emissive value. 0=no emissive, 1=full emissive.
  emissive: f32,
};

// Ray is a start point and direction.
struct Ray {
  start: vec3<f32>,
  dir: vec3<f32>,
}

// Value for HitInfo.quad if no intersection occured.
const kNoHit = 0xffffffff;

// HitInfo describes the hit location of a ray-quad intersection
struct HitInfo {
  // Distance along the ray to the intersection
  dist: f32,
  // The quad index that was hit
  quad: u32,
  // The position of the intersection
  pos: vec3<f32>,
  // The UVs of the quad at the point of intersection
  uv: vec2<f32>,
}

// CommonUniforms uniform buffer data
struct CommonUniforms {
  // Model View Projection matrix
  mvp: mat4x4<f32>,
  // Inverse of mvp
  inv_mvp: mat4x4<f32>,
  // Random seed for the workgroup
  seed: vec3<u32>,
}

// The common uniform buffer binding.
@group(0) @binding(0) var<uniform> common_uniforms : CommonUniforms;

// The quad buffer binding.
@group(0) @binding(1) var<storage> quads : array<Quad>;

// intersect_ray_quad will check to see if the ray 'r' intersects the quad 'q'.
// If an intersection occurs, and the intersection is closer than 'closest' then
// the intersection information is returned, otherwise 'closest' is returned.
fn intersect_ray_quad(r: Ray, quad: u32, closest: HitInfo) -> HitInfo {
    let q = quads[quad];
    let plane_dist = dot(q.plane, vec4(r.start, 1.0));
    let ray_dist = plane_dist / -dot(q.plane.xyz, r.dir);
    let pos = r.start + r.dir * ray_dist;
    let uv = vec2(dot(vec4<f32>(pos, 1.0), q.right), dot(vec4<f32>(pos, 1.0), q.up)) * 0.5 + 0.5;
    let hit = plane_dist > 0.0 && ray_dist > 0.0 && ray_dist < closest.dist && all((uv > vec2<f32>()) & (uv < vec2<f32>(1.0)));
    return HitInfo(
        select(closest.dist, ray_dist, hit),
        select(closest.quad, quad, hit),
        select(closest.pos, pos, hit),
        select(closest.uv, uv, hit),
    );
}

// raytrace finds the closest intersecting quad for the given ray
fn raytrace(ray: Ray) -> HitInfo {
    var hit = HitInfo();
    hit.dist = 1e20;
    hit.quad = kNoHit;
    for (var quad = 0u; quad < arrayLength(&quads); quad++) {
        hit = intersect_ray_quad(ray, quad, hit);
    }
    return hit;
}

// A psuedo random number. Initialized with init_rand(), updated with rand().
var<private> rnd : vec3<u32>;

// Initializes the random number generator.
fn init_rand(invocation_id: vec3<u32>) {
    const A = vec3(1741651 * 1009, 140893 * 1609 * 13, 6521 * 983 * 7 * 2);
    rnd = (invocation_id * A) ^ common_uniforms.seed;
}

// Returns a random number between 0 and 1.
fn rand() -> f32 {
    const C = vec3(60493 * 9377, 11279 * 2539 * 23, 7919 * 631 * 5 * 3);

    rnd = (rnd * C) ^ (rnd.yzx >> vec3(4u));
    return f32(rnd.x ^ rnd.y) / f32(0xffffffff);
}

// Returns a random point within a unit sphere centered at (0,0,0).
fn rand_unit_sphere() -> vec3<f32> {
    var u = rand();
    var v = rand();
    var theta = u * 2.0 * pi;
    var phi = acos(2.0 * v - 1.0);
    var r = pow(rand(), 1.0 / 3.0);
    var sin_theta = sin(theta);
    var cos_theta = cos(theta);
    var sin_phi = sin(phi);
    var cos_phi = cos(phi);
    var x = r * sin_phi * sin_theta;
    var y = r * sin_phi * cos_theta;
    var z = r * cos_phi;
    return vec3<f32>(x, y, z);
}

fn rand_concentric_disk() -> vec2<f32> {
    let u = vec2<f32>(rand(), rand());
    let uOffset = 2.f * u - vec2<f32>(1.0, 1.0);

    if uOffset.x == 0.0 && uOffset.y == 0.0 {
        return vec2<f32>(0.0, 0.0);
    }

    var theta = 0.0;
    var r = 0.0;
    if abs(uOffset.x) > abs(uOffset.y) {
        r = uOffset.x;
        theta = (pi / 4.0) * (uOffset.y / uOffset.x);
    } else {
        r = uOffset.y;
        theta = (pi / 2.0) - (pi / 4.0) * (uOffset.x / uOffset.y);
    }
    return r * vec2<f32>(cos(theta), sin(theta));
}

fn rand_cosine_weighted_hemisphere() -> vec3<f32> {
    let d = rand_concentric_disk();
    let z = sqrt(max(0.0, 1.0 - d.x * d.x - d.y * d.y));
    return vec3<f32>(d.x, d.y, z);
}
`;class O{constructor(a){this.wgsl=G,this.frame=0,this.uniformBuffer=new Uint8Array(0+4*16+4*16+4*4);const r={common_uniforms:{bufferView:this.uniformBuffer},quads:{bufferView:a}};this.uniforms={bindGroup:r}}update(a){const r=x.perspective(2*Math.PI/8,a.aspect,.5,100),s=a.rotateCamera?this.frame/1e3:0,e=x.lookAt(o.fromValues(Math.sin(s)*15,5,Math.cos(s)*15),o.fromValues(0,5,0),o.fromValues(0,1,0)),u=x.multiply(r,e),l=x.invert(u),f=new Float32Array(this.uniformBuffer.byteLength/4),c=new Uint32Array(f.buffer);for(let t=0;t<16;t++)f[t]=u[t];for(let t=0;t<16;t++)f[t+16]=l[t];c[32]=4294967295*Math.random(),c[33]=4294967295*Math.random(),c[34]=4294967295*Math.random(),V(M(this.uniformBuffer)).writeBuffers=[{data:f}],this.frame++}}const A=`// A storage buffer holding an array of atomic<u32>.
// The array elements are a sequence of red, green, blue components, for each
// lightmap texel, for each quad surface.
@group(1) @binding(0)
var<storage, read_write> accumulation : array<atomic<u32>>;

// The output lightmap texture.
@group(1) @binding(1)
var lightmap : texture_storage_2d_array<rgba16float, write>;

// Uniform data used by the accumulation_to_lightmap entry point
struct Uniforms {
  // Scalar for converting accumulation values to output lightmap values
  accumulation_to_lightmap_scale: f32,
  // Accumulation buffer rescaling value
  accumulation_buffer_scale: f32,
  // The width of the light
  light_width: f32,
  // The height of the light
  light_height: f32,
  // The center of the light
  light_center: vec3<f32>,
}

// accumulation_to_lightmap uniforms binding point
@group(1) @binding(2) var<uniform> uniforms : Uniforms;

// Number of photons emitted per workgroup
override PhotonsPerWorkgroup : u32;

// Maximum value that can be added to the accumulation buffer from a single photon
override PhotonEnergy : f32;

// Number of bounces of each photon
const PhotonBounces = 4;

// Amount of light absorbed with each photon bounce (0: 0%, 1: 100%)
const LightAbsorbtion = 0.5;

// Radiosity compute shader.
// Each invocation creates a photon from the light source, and accumulates
// bounce lighting into the 'accumulation' buffer.
@compute @workgroup_size(PhotonsPerWorkgroup)
fn radiosity(@builtin(global_invocation_id) invocation_id: vec3<u32>) {
    init_rand(invocation_id);
    photon();
}

// Spawns a photon at the light source, performs ray tracing in the scene,
// accumulating light values into 'accumulation' for each quad surface hit.
fn photon() {
  // Create a random ray from the light.
    var ray = new_light_ray();
  // Give the photon an initial energy value.
    var color = PhotonEnergy * vec3<f32>(1.0, 0.8, 0.6);

  // Start bouncing.
    for (var i = 0; i < (PhotonBounces + 1); i++) {
    // Find the closest hit of the ray with the scene's quads.
        let hit = raytrace(ray);
        let quad = quads[hit.quad];

    // Bounce the ray.
        ray.start = hit.pos + quad.plane.xyz * 1e-5;
        ray.dir = normalize(reflect(ray.dir, quad.plane.xyz) + rand_unit_sphere() * 0.75);

    // Photon color is multiplied by the quad's color.
        color *= quad.color;

    // Accumulate the aborbed light into the 'accumulation' buffer.
        accumulate(hit.uv, hit.quad, color * LightAbsorbtion);

    // What wasn't absorbed is reflected.
        color *= 1 - LightAbsorbtion;
    }
}

// Performs an atomicAdd() with 'color' into the 'accumulation' buffer at 'uv'
// and 'quad'.
fn accumulate(uv: vec2<f32>, quad: u32, color: vec3<f32>) {
    let dims = textureDimensions(lightmap);
    let base_idx = accumulation_base_index(vec2<u32>(uv * vec2<f32>(dims)), quad);
    atomicAdd(&accumulation[base_idx + 0u], u32(color.r + 0.5));
    atomicAdd(&accumulation[base_idx + 1u], u32(color.g + 0.5));
    atomicAdd(&accumulation[base_idx + 2u], u32(color.b + 0.5));
}

// Returns the base element index for the texel at 'coord' for 'quad'
fn accumulation_base_index(coord: vec2<u32>, quad: u32) -> u32 {
    let dims = textureDimensions(lightmap);
    let c = min(vec2<u32>(dims) - 1u, coord);
    return 3 * (c.x + dims.x * c.y + dims.x * dims.y * quad);
}

// Returns a new Ray at a random point on the light, in a random downwards
// direction.
fn new_light_ray() -> Ray {
    let center = uniforms.light_center;
    let pos = center + vec3<f32>(uniforms.light_width * (rand() - 0.5), 0.0, uniforms.light_height * (rand() - 0.5));
    var dir = rand_cosine_weighted_hemisphere().xzy;
    dir.y = -dir.y;
    return Ray(pos, dir);
}

override AccumulationToLightmapWorkgroupSizeX : u32;
override AccumulationToLightmapWorkgroupSizeY : u32;

// Compute shader used to copy the atomic<u32> data in 'accumulation' to
// 'lightmap'. 'accumulation' might also be scaled to reduce integer overflow.
@compute @workgroup_size(AccumulationToLightmapWorkgroupSizeX, AccumulationToLightmapWorkgroupSizeY)
fn accumulation_to_lightmap(@builtin(global_invocation_id) invocation_id: vec3<u32>, @builtin(workgroup_id)         workgroup_id: vec3<u32>) {
    let dims = textureDimensions(lightmap);
    let quad = workgroup_id.z; // The workgroup 'z' value holds the quad index.
    let coord = invocation_id.xy;
    if all(coord < dims) {
    // Load the color value out of 'accumulation'
        let base_idx = accumulation_base_index(coord, quad);
        let color = vec3(f32(atomicLoad(&accumulation[base_idx + 0])), f32(atomicLoad(&accumulation[base_idx + 1])), f32(atomicLoad(&accumulation[base_idx + 2])));

    // Multiply the color by 'uniforms.accumulation_to_lightmap_scale' and write it to
    // the lightmap.
        textureStore(lightmap, coord, quad, vec4(color * uniforms.accumulation_to_lightmap_scale, 1));

    // If the 'accumulation' buffer is nearing saturation, then
    // 'uniforms.accumulation_buffer_scale' will be less than 1, scaling the values
    // to something less likely to overflow the u32.
        if uniforms.accumulation_buffer_scale != 1.0 {
            let scaled = color * uniforms.accumulation_buffer_scale + 0.5;
            atomicStore(&accumulation[base_idx + 0], u32(scaled.r));
            atomicStore(&accumulation[base_idx + 1], u32(scaled.g));
            atomicStore(&accumulation[base_idx + 2], u32(scaled.b));
        }
    }
}
`,k=class m{constructor(a,r){this.kPhotonsPerWorkgroup=256,this.kWorkgroupsPerFrame=1024,this.kPhotonsPerFrame=this.kPhotonsPerWorkgroup*this.kWorkgroupsPerFrame,this.kPhotonEnergy=1e5,this.kAccumulationToLightmapWorkgroupSizeX=16,this.kAccumulationToLightmapWorkgroupSizeY=16,this.accumulationMean=0,this.kAccumulationMeanMax=268435456,this.common=a,this.scene=r,this.lightmap={label:"Radiosity.lightmap",size:[m.lightmapWidth,m.lightmapHeight,r.quads.length],format:m.lightmapFormat},this.accumulationBuffer=new Uint8Array(m.lightmapWidth*m.lightmapHeight*r.quads.length*16),this.kTotalLightmapTexels=m.lightmapWidth*m.lightmapHeight*r.quads.length,this.uniformBuffer=new Uint8Array(8*4),this.bindGroup={accumulation:{bufferView:this.accumulationBuffer},lightmap:{texture:this.lightmap},uniforms:{bufferView:this.uniformBuffer}},this.radiosityPipeline={label:"Radiosity.radiosityPipeline",compute:{code:A+a.wgsl,entryPoint:"radiosity",constants:{PhotonsPerWorkgroup:this.kPhotonsPerWorkgroup,PhotonEnergy:this.kPhotonEnergy}}},this.accumulationToLightmapPipeline={label:"Radiosity.accumulationToLightmapPipeline",compute:{code:A+a.wgsl,entryPoint:"accumulation_to_lightmap",constants:{AccumulationToLightmapWorkgroupSizeX:this.kAccumulationToLightmapWorkgroupSizeX,AccumulationToLightmapWorkgroupSizeY:this.kAccumulationToLightmapWorkgroupSizeY}}};const s=this.lightmap.size;this.passEncoders=[{__type__:"ComputePass",computeObjects:[{pipeline:this.radiosityPipeline,bindingResources:{...this.common.uniforms.bindGroup,...this.bindGroup},workgroups:{workgroupCountX:this.kWorkgroupsPerFrame}},{pipeline:this.accumulationToLightmapPipeline,bindingResources:{...this.common.uniforms.bindGroup,...this.bindGroup},workgroups:{workgroupCountX:Math.ceil(m.lightmapWidth/this.kAccumulationToLightmapWorkgroupSizeX),workgroupCountY:Math.ceil(m.lightmapHeight/this.kAccumulationToLightmapWorkgroupSizeY),workgroupCountZ:s[2]??1}}]}]}encode(a){this.passEncoders.forEach(r=>{a.passEncoders.push(r)})}run(){this.accumulationMean+=this.kPhotonsPerFrame*this.kPhotonEnergy/this.kTotalLightmapTexels;const a=1/this.accumulationMean,r=this.accumulationMean>2*this.kAccumulationMeanMax?.5:1;this.accumulationMean*=r;const s=new Float32Array(this.uniformBuffer.byteLength/4);s[0]=a,s[1]=r,s[2]=this.scene.lightWidth,s[3]=this.scene.lightHeight,s[4]=this.scene.lightCenter[0],s[5]=this.scene.lightCenter[1],s[6]=this.scene.lightCenter[2],V(M(this.uniformBuffer)).writeBuffers=[{data:s}]}};k.lightmapFormat="rgba16float";k.lightmapWidth=256;k.lightmapHeight=256;let F=k;const R=`// The lightmap data
@group(1) @binding(0) var lightmap : texture_2d_array<f32>;

// The sampler used to sample the lightmap
@group(1) @binding(1) var smpl : sampler;

// Vertex shader input data
struct VertexIn {
  @location(0) position: vec4<f32>,
  @location(1) uv: vec3<f32>,
  @location(2) emissive: vec3<f32>,
}

// Vertex shader output data
struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) emissive: vec3<f32>,
  @interpolate(flat)
  @location(2) quad: u32,
}

@vertex
fn vs_main(input: VertexIn) -> VertexOut {
    var output: VertexOut;
    output.position = common_uniforms.mvp * input.position;
    output.uv = input.uv.xy;
    output.quad = u32(input.uv.z + 0.5);
    output.emissive = input.emissive;
    return output;
}

@fragment
fn fs_main(vertex_out: VertexOut) -> @location(0) vec4<f32> {
    return textureSample(lightmap, smpl, vertex_out.uv, vertex_out.quad) + vec4<f32>(vertex_out.emissive, 1.0);
}
`;class U{constructor(a,r,s,e){this.common=a,this.scene=r;const u=e.size,l={label:"RasterizerRenderer.depthTexture",size:[u[0],u[1]],format:"depth24plus"};this.renderPassDescriptor={label:"RasterizerRenderer.renderPassDescriptor",colorAttachments:[{view:{texture:e},clearValue:[.1,.2,.3,1]}],depthStencilAttachment:{view:{texture:l},depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},this.bindGroup={lightmap:{texture:s.lightmap},smpl:{addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge",magFilter:"linear",minFilter:"linear"}},this.pipeline={label:"RasterizerRenderer.pipeline",vertex:{code:R+a.wgsl},fragment:{code:R+a.wgsl},primitive:{cullFace:"back"}},this.renderPassEncoder={descriptor:this.renderPassDescriptor,renderPassObjects:[{pipeline:this.pipeline,bindingResources:{...this.common.uniforms.bindGroup,...this.bindGroup},vertices:this.scene.vertexAttributes,indices:this.scene.indices,draw:{__type__:"DrawIndexed",indexCount:this.scene.indexCount}}]}}encode(a){a.passEncoders.push(this.renderPassEncoder)}}const X=`// The lightmap data
@group(1) @binding(0) var lightmap : texture_2d_array<f32>;

// The sampler used to sample the lightmap
@group(1) @binding(1) var smpl : sampler;

// The output framebuffer
@group(1) @binding(2) var framebuffer : texture_storage_2d<rgba16float, write>;

override WorkgroupSizeX : u32;
override WorkgroupSizeY : u32;

const NumReflectionRays = 5;

@compute @workgroup_size(WorkgroupSizeX, WorkgroupSizeY)
fn main(@builtin(global_invocation_id) invocation_id : vec3<u32>) {
  if (all(invocation_id.xy < textureDimensions(framebuffer))) {
    init_rand(invocation_id);

    // Calculate the fragment's NDC coordinates for the intersection of the near
    // clip plane and far clip plane
    let uv = vec2<f32>(invocation_id.xy) / vec2<f32>(textureDimensions(framebuffer).xy);
    let ndcXY = (uv - 0.5) * vec2(2.0, -2.0);

    // Transform the coordinates back into world space
    var near = common_uniforms.inv_mvp * vec4<f32>(ndcXY, 0.0, 1.0);
    var far = common_uniforms.inv_mvp * vec4<f32>(ndcXY, 1.0, 1.0);
    near /= near.w;
    far /= far.w;

    // Create a ray that starts at the near clip plane, heading in the fragment's
    // z-direction, and raytrace to find the nearest quad that the ray intersects.
    let ray = Ray(near.xyz, normalize(far.xyz - near.xyz));
    let hit = raytrace(ray);

    let hit_color = sample_hit(hit);
    var normal = quads[hit.quad].plane.xyz;

    // Fire a few rays off the surface to collect some reflections
    let bounce = reflect(ray.dir, normal);
    var reflection : vec3<f32>;
    for (var i = 0; i < NumReflectionRays; i++) {
      let reflection_dir = normalize(bounce + rand_unit_sphere()*0.1);
      let reflection_ray = Ray(hit.pos + bounce * 1e-5, reflection_dir);
      let reflection_hit = raytrace(reflection_ray);
      reflection += sample_hit(reflection_hit);
    }
    let color = mix(reflection / NumReflectionRays, hit_color, 0.95);

    textureStore(framebuffer, invocation_id.xy, vec4(color, 1.0));
  }
}


// Returns the sampled hit quad's lightmap at 'hit.uv', and adds the quad's
// emissive value.
fn sample_hit(hit : HitInfo) -> vec3<f32> {
  let quad = quads[hit.quad];
  // Sample the quad's lightmap, and add emissive.
  return textureSampleLevel(lightmap, smpl, hit.uv, hit.quad, 0).rgb +
         quad.emissive * quad.color;
}
`;class I{constructor(a,r,s){this.kWorkgroupSizeX=16,this.kWorkgroupSizeY=16,this.common=a,this.framebuffer=s,this.bindGroup={lightmap:{texture:r.lightmap},smpl:{addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge",addressModeW:"clamp-to-edge",magFilter:"linear",minFilter:"linear"},framebuffer:{texture:s}},this.material={label:"raytracerPipeline",compute:{code:X+a.wgsl,constants:{WorkgroupSizeX:this.kWorkgroupSizeX,WorkgroupSizeY:this.kWorkgroupSizeY}}};const e=this.framebuffer.size;this.passEncoder={__type__:"ComputePass",computeObjects:[{pipeline:this.material,bindingResources:{...this.common.uniforms.bindGroup,...this.bindGroup},workgroups:{workgroupCountX:Math.ceil(e[0]/this.kWorkgroupSizeX),workgroupCountY:Math.ceil(e[1]/this.kWorkgroupSizeY)}}]}}encode(a){a.passEncoders.push(this.passEncoder)}}function C(n){const a=1/o.lenSq(n);return o.mul(o.fromValues(a,a,a),n)}function P(n){const a=o.fromValues(Math.cos(n.rotation)*(n.width/2),0,Math.sin(n.rotation)*(n.depth/2)),r=o.fromValues(0,n.height/2,0),s=o.fromValues(Math.sin(n.rotation)*(n.width/2),0,-Math.cos(n.rotation)*(n.depth/2)),e=n.color instanceof Array?n.color:new Array(6).fill(n.color),u=l=>n.type==="concave"?l:o.negate(l);return[{center:o.add(n.center,a),right:u(o.negate(s)),up:r,color:e[0]},{center:o.add(n.center,r),right:u(a),up:o.negate(s),color:e[1]},{center:o.add(n.center,s),right:u(a),up:r,color:e[2]},{center:o.sub(n.center,a),right:u(s),up:r,color:e[3]},{center:o.sub(n.center,r),right:u(a),up:s,color:e[4]},{center:o.sub(n.center,s),right:u(o.negate(a)),up:r,color:e[5]}]}const w={center:o.fromValues(0,9.95,0),right:o.fromValues(1,0,0),up:o.fromValues(0,0,1),color:o.fromValues(5,5,5),emissive:1};class Y{constructor(){this.quads=[...P({center:o.fromValues(0,5,0),width:10,height:10,depth:10,rotation:0,color:[o.fromValues(0,.5,0),o.fromValues(.5,.5,.5),o.fromValues(.5,.5,.5),o.fromValues(.5,0,0),o.fromValues(.5,.5,.5),o.fromValues(.5,.5,.5)],type:"concave"}),...P({center:o.fromValues(1.5,1.5,1),width:3,height:3,depth:3,rotation:.3,color:o.fromValues(.8,.8,.8),type:"convex"}),...P({center:o.fromValues(-2,3,-2),width:3,height:6,depth:3,rotation:-.4,color:o.fromValues(.8,.8,.8),type:"convex"}),w],this.lightCenter=w.center,this.lightWidth=o.len(w.right)*2,this.lightHeight=o.len(w.up)*2;const a=16*4,r=new Float32Array(a*this.quads.length/4),s=4*10,e=new Float32Array(this.quads.length*s),u=new Uint16Array(this.quads.length*6);let l=0,f=0,c=0,t=0,h=0;for(let d=0;d<this.quads.length;d++){const i=this.quads[d],g=o.normalize(o.cross(i.right,i.up));r[c++]=g[0],r[c++]=g[1],r[c++]=g[2],r[c++]=-o.dot(g,i.center);const _=C(i.right);r[c++]=_[0],r[c++]=_[1],r[c++]=_[2],r[c++]=-o.dot(_,i.center);const y=C(i.up);r[c++]=y[0],r[c++]=y[1],r[c++]=y[2],r[c++]=-o.dot(y,i.center),r[c++]=i.color[0],r[c++]=i.color[1],r[c++]=i.color[2],r[c++]=i.emissive??0;const z=o.add(o.sub(i.center,i.right),i.up),S=o.add(o.add(i.center,i.right),i.up),W=o.sub(o.sub(i.center,i.right),i.up),T=o.sub(o.add(i.center,i.right),i.up);e[t++]=z[0],e[t++]=z[1],e[t++]=z[2],e[t++]=1,e[t++]=0,e[t++]=1,e[t++]=d,e[t++]=i.color[0]*(i.emissive??0),e[t++]=i.color[1]*(i.emissive??0),e[t++]=i.color[2]*(i.emissive??0),e[t++]=S[0],e[t++]=S[1],e[t++]=S[2],e[t++]=1,e[t++]=1,e[t++]=1,e[t++]=d,e[t++]=i.color[0]*(i.emissive??0),e[t++]=i.color[1]*(i.emissive??0),e[t++]=i.color[2]*(i.emissive??0),e[t++]=W[0],e[t++]=W[1],e[t++]=W[2],e[t++]=1,e[t++]=0,e[t++]=0,e[t++]=d,e[t++]=i.color[0]*(i.emissive??0),e[t++]=i.color[1]*(i.emissive??0),e[t++]=i.color[2]*(i.emissive??0),e[t++]=T[0],e[t++]=T[1],e[t++]=T[2],e[t++]=1,e[t++]=1,e[t++]=0,e[t++]=d,e[t++]=i.color[0]*(i.emissive??0),e[t++]=i.color[1]*(i.emissive??0),e[t++]=i.color[2]*(i.emissive??0),u[h++]=l+0,u[h++]=l+2,u[h++]=l+1,u[h++]=l+1,u[h++]=l+2,u[h++]=l+3,f+=6,l+=4}const p=r,v=e,q={position:{data:v,format:"float32x4",offset:0*4,arrayStride:s},uv:{data:v,format:"float32x3",offset:4*4,arrayStride:s},emissive:{data:v,format:"float32x3",offset:7*4,arrayStride:s}},b=u;this.vertexCount=l,this.indexCount=f,this.vertices=v,this.vertexAttributes=q,this.indices=b,this.quadBuffer=p}}const D=`// The linear-light input framebuffer
@group(0) @binding(0) var input  : texture_2d<f32>;

// The tonemapped, gamma-corrected output framebuffer
@group(0) @binding(1) var output : texture_storage_2d<{OUTPUT_FORMAT}, write>;

const TonemapExposure = 0.5;

const Gamma = 2.2;

override WorkgroupSizeX : u32;
override WorkgroupSizeY : u32;

@compute @workgroup_size(WorkgroupSizeX, WorkgroupSizeY)
fn main(@builtin(global_invocation_id) invocation_id: vec3<u32>) {
    let color = textureLoad(input, vec2<i32>(invocation_id.xy), 0).rgb;
    let tonemapped = reinhard_tonemap(color);
    textureStore(output, vec2<i32>(invocation_id.xy), vec4<f32>(tonemapped, 1.0));
}

fn reinhard_tonemap(linearColor: vec3<f32>) -> vec3<f32> {
    let color = linearColor * TonemapExposure;
    let mapped = color / (1.0 + color);
    return pow(mapped, vec3<f32>(1.0 / Gamma));
}
`;class B{constructor(a,r,s){this.kWorkgroupSizeX=16,this.kWorkgroupSizeY=16;const e=r.size;this.width=e[0],this.height=e[1],this.bindGroup={input:{texture:r},output:{texture:s}},this.material={label:"Tonemap.pipeline",compute:{code:D.replace("{OUTPUT_FORMAT}",s.context.configuration.format),constants:{WorkgroupSizeX:this.kWorkgroupSizeX,WorkgroupSizeY:this.kWorkgroupSizeY}}},this.passEncoder={__type__:"ComputePass",computeObjects:[{pipeline:this.material,bindingResources:{...this.bindGroup},workgroups:{workgroupCountX:Math.ceil(this.width/this.kWorkgroupSizeX),workgroupCountY:Math.ceil(this.height/this.kWorkgroupSizeY)}}]}}encode(a){a.passEncoders.push(this.passEncoder)}}const H=async(n,a)=>{const s=navigator.gpu.getPreferredCanvasFormat()==="bgra8unorm"?["bgra8unorm-storage"]:[],e={canvasId:n.id,configuration:{format:"rgba16float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.STORAGE_BINDING}},u={renderer:"rasterizer",rotateCamera:!0};a.add(u,"renderer",["rasterizer","raytracer"]),a.add(u,"rotateCamera",!0);const l=window.devicePixelRatio||1;n.width=n.clientWidth*l,n.height=n.clientHeight*l;const f=await new E().init(void 0,{requiredFeatures:s}),c={label:"framebuffer",size:[n.width,n.height],format:"rgba16float"},t=new Y,h=new O(t.quadBuffer),p=new F(h,t),v=new U(h,t,p,c),q=new I(h,p,c),b=new B(h,c,{context:e}),d={passEncoders:[]};p.encode(d),v.encode(d),b.encode(d);const i={passEncoders:[]};p.encode(i),q.encode(i),b.encode(i);function g(){h.update({rotateCamera:u.rotateCamera,aspect:n.width/n.height}),p.run();const _={commandEncoders:[u.renderer==="rasterizer"?d:i]};f.submit(_),requestAnimationFrame(g)}requestAnimationFrame(g)},N=new L({width:310}),j=document.getElementById("webgpu");H(j,N);
