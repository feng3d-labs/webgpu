import"../../../modulepreload-polyfill-3cfb730f.js";import{W as V}from"../../../Buffer-5212487c.js";import{G as b}from"../../../dat.gui.module-5ea4ba08.js";const u=`struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(4) color: vec4<f32>,
}

@vertex
fn vert_main(
    @location(0) a_particlePos: vec2<f32>,
    @location(1) a_particleVel: vec2<f32>,
    @location(2) a_pos: vec2<f32>
) -> VertexOutput {
    let angle = -atan2(a_particleVel.x, a_particleVel.y);
    let pos = vec2(
        (a_pos.x * cos(angle)) - (a_pos.y * sin(angle)),
        (a_pos.x * sin(angle)) + (a_pos.y * cos(angle))
    );

    var output: VertexOutput;
    output.position = vec4(pos + a_particlePos, 0.0, 1.0);
    output.color = vec4(
        1.0 - sin(angle + 1.0) - a_particleVel.y,
        pos.x * 100.0 - a_particleVel.y + 0.1,
        a_particleVel.x + cos(angle + 0.5),
        1.0
    );
    return output;
}

@fragment
fn frag_main(@location(4) color: vec4<f32>) -> @location(0) vec4<f32> {
    return color;
}`,_=`struct Particle {
  pos: vec2<f32>,
  vel: vec2<f32>,
}
struct SimParams {
  deltaT: f32,
  rule1Distance: f32,
  rule2Distance: f32,
  rule3Distance: f32,
  rule1Scale: f32,
  rule2Scale: f32,
  rule3Scale: f32,
}
struct Particles {
  particles: array<Particle>,
}
@binding(0) @group(0) var<uniform> params : SimParams;
@binding(1) @group(0) var<storage, read> particlesA : Particles;
@binding(2) @group(0) var<storage, read_write> particlesB : Particles;

// https://github.com/austinEng/Project6-Vulkan-Flocking/blob/master/data/shaders/computeparticles/particle.comp
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    var index = GlobalInvocationID.x;

    var vPos = particlesA.particles[index].pos;
    var vVel = particlesA.particles[index].vel;
    var cMass = vec2(0.0);
    var cVel = vec2(0.0);
    var colVel = vec2(0.0);
    var cMassCount = 0u;
    var cVelCount = 0u;
    var pos: vec2<f32>;
    var vel: vec2<f32>;

    for (var i = 0u; i < arrayLength(&particlesA.particles); i++) {
        if i == index {
      continue;
        }

        pos = particlesA.particles[i].pos.xy;
        vel = particlesA.particles[i].vel.xy;
        if distance(pos, vPos) < params.rule1Distance {
            cMass += pos;
            cMassCount++;
        }
        if distance(pos, vPos) < params.rule2Distance {
            colVel -= pos - vPos;
        }
        if distance(pos, vPos) < params.rule3Distance {
            cVel += vel;
            cVelCount++;
        }
    }
    if cMassCount > 0u {
        cMass = (cMass / vec2(f32(cMassCount))) - vPos;
    }
    if cVelCount > 0u {
        cVel /= f32(cVelCount);
    }
    vVel += (cMass * params.rule1Scale) + (colVel * params.rule2Scale) + (cVel * params.rule3Scale);

  // clamp velocity for a more pleasing simulation
    vVel = normalize(vVel) * clamp(length(vVel), 0.0, 0.1);
  // kinematic update
    vPos = vPos + (vVel * params.deltaT);
  // Wrap around boundary
    if vPos.x < -1.0 {
        vPos.x = 1.0;
    }
    if vPos.x > 1.0 {
        vPos.x = -1.0;
    }
    if vPos.y < -1.0 {
        vPos.y = 1.0;
    }
    if vPos.y > 1.0 {
        vPos.y = -1.0;
    }
  // Write back
    particlesB.particles[index].pos = vPos;
    particlesB.particles[index].vel = vVel;
}
`,x=async(r,v)=>{const n=window.devicePixelRatio||1;r.width=r.clientWidth*n,r.height=r.clientHeight*n;const d=await new V().init(),f=new Float32Array([-.01,-.02,.01,-.02,0,.02]),o={deltaT:.04,rule1Distance:.1,rule2Distance:.025,rule3Distance:.025,rule1Scale:.02,rule2Scale:.05,rule3Scale:.005};Object.keys(o).forEach(e=>{v.add(o,e)});const s=1500,i=new Float32Array(s*4);for(let e=0;e<s;++e)i[4*e+0]=2*(Math.random()-.5),i[4*e+1]=2*(Math.random()-.5),i[4*e+2]=2*(Math.random()-.5)*.1,i[4*e+3]=2*(Math.random()-.5)*.1;const a=new Array(2);for(let e=0;e<2;++e)a[e]=i.slice();const c={pipeline:{compute:{code:_}},bindingResources:{params:o,particlesA:{bufferView:a[0]},particlesB:{bufferView:a[1]}},workgroups:{workgroupCountX:Math.ceil(s/64)}},m={...c,bindingResources:{...c.bindingResources,particlesA:{...c.bindingResources.particlesA,bufferView:a[1]},particlesB:{...c.bindingResources.particlesA,bufferView:a[0]}}},g={colorAttachments:[{view:{texture:{context:{canvasId:r.id}}},clearValue:[0,0,0,1]}]},t={pipeline:{vertex:{code:u},fragment:{code:u},primitive:{cullFace:"back"}},vertices:{a_particlePos:{data:a[0],format:"float32x2",offset:0,arrayStride:4*4,stepMode:"instance"},a_particleVel:{data:a[0],format:"float32x2",offset:2*4,arrayStride:4*4,stepMode:"instance"},a_pos:{data:f,format:"float32x2"}},draw:{__type__:"DrawVertex",vertexCount:3,instanceCount:s}},P={...t,draw:t.draw,vertices:{...t.vertices,a_particlePos:{...t.vertices.a_particlePos,data:a[1]},a_particleVel:{...t.vertices.a_particleVel,data:a[1]}}};let l=0;function p(){const e={commandEncoders:[{passEncoders:[{__type__:"ComputePass",computeObjects:[[c,m][l%2]]},{descriptor:g,renderPassObjects:[[t,P][(l+1)%2]]}]}]};d.submit(e),++l,requestAnimationFrame(p)}requestAnimationFrame(p)},w=new b({width:310}),y=document.getElementById("webgpu");x(y,w);
