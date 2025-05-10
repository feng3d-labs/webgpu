import"../../../modulepreload-polyfill-3cfb730f.js";import{G as N}from"../../../dat.gui.module-5ea4ba08.js";import{m as e}from"../../../wgpu-matrix.module-82499b8f.js";import{r as M,W as H,g as y}from"../../../Buffer-23ffa079.js";const O=`@group(0) @binding(0) var tex: texture_2d<f32>;

struct Varying {
  @builtin(position) pos: vec4<f32>,
  @location(0) texelCoord: vec2<f32>,
  @location(1) mipLevel: f32,
}

const kMipLevels = 4u;
const baseMipSize = 16;

@vertex
fn vmain(
    @builtin(instance_index) instance_index: u32, // used as mipLevel
    @builtin(vertex_index) vertex_index: u32,
) -> Varying {
    var square = array<vec2<f32>,6>(
        vec2<f32>(0.0, 0.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 1.0),
    );
    let uv = square[vertex_index];
    let pos = vec4(uv * 2.0 - vec2(1.0, 1.0), 0.0, 1.0);

    let mipLevel = instance_index;
    let mipSize = f32(1 << (kMipLevels - mipLevel));
    let texelCoord = uv * mipSize;
    return Varying(pos, texelCoord, f32(mipLevel));
}

@fragment
fn fmain(vary: Varying) -> @location(0) vec4<f32> {
    return textureLoad(tex, vec2<i32>(vary.texelCoord), i32(vary.mipLevel));
}
`,A=`struct Config {
  viewProj: mat4x4<f32>,
  animationOffset: vec2<f32>,
  flangeSize: f32,
  highlightFlange: f32,
};
@group(0) @binding(0) var<uniform> config: Config;
@group(0) @binding(1) var<storage, read> matrices: array<mat4x4<f32>>;
@group(0) @binding(2) var samp: sampler;
@group(0) @binding(3) var tex: texture_2d<f32>;

struct Varying {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

override kTextureBaseSize: f32;
override kViewportSize: f32;

@vertex
fn vmain(
    @builtin(instance_index) instance_index: u32,
    @builtin(vertex_index) vertex_index: u32,
) -> Varying {
    let flange = config.flangeSize;
    var uvs = array<vec2<f32>,6>(
        vec2(-flange, -flange),
        vec2(-flange, 1.0 + flange),
        vec2(1.0 + flange, -flange),
        vec2(1.0 + flange, -flange),
        vec2(-flange, 1.0 + flange),
        vec2(1.0 + flange, 1.0 + flange),
    );
  // Default size (if matrix is the identity) makes 1 texel = 1 pixel.
    let radius = (1.0 + 2.0 * flange) * kTextureBaseSize / kViewportSize;
    var positions = array<vec2<f32>,6>(
        vec2(-radius, -radius),
        vec2(-radius, radius),
        vec2(radius, -radius),
        vec2(radius, -radius),
        vec2(-radius, radius),
        vec2(radius, radius),
    );

    let modelMatrix = matrices[instance_index];
    let pos = config.viewProj * modelMatrix * vec4<f32>(positions[vertex_index] + config.animationOffset, 0.0, 1.0);
    return Varying(pos, uvs[vertex_index]);
}

@fragment
fn fmain(vary: Varying) -> @location(0) vec4<f32> {
    let uv = vary.uv;
    var color = textureSample(tex, samp, uv);

    let outOfBounds = uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0;
    if config.highlightFlange > 0.0 && outOfBounds {
        color += vec4(0.7, 0.0, 0.0, 0.0);
    }

    return color;
}

`,J=new Float32Array([...e.scale(e.rotationZ(Math.PI/16),[2,2,1]),...e.scale(e.identity(),[2,2,1]),...e.scale(e.rotationX(-Math.PI*.3),[2,2,1]),...e.scale(e.rotationX(-Math.PI*.42),[2,2,1]),...e.rotationZ(Math.PI/16),...e.identity(),...e.rotationX(-Math.PI*.3),...e.rotationX(-Math.PI*.42),...e.scale(e.rotationZ(Math.PI/16),[.9,.9,1]),...e.scale(e.identity(),[.9,.9,1]),...e.scale(e.rotationX(-Math.PI*.3),[.9,.9,1]),...e.scale(e.rotationX(-Math.PI*.42),[.9,.9,1]),...e.scale(e.rotationZ(Math.PI/16),[.3,.3,1]),...e.scale(e.identity(),[.3,.3,1]),...e.scale(e.rotationX(-Math.PI*.3),[.3,.3,1])]),K=async(p,o)=>{const C={flangeLogSize:1,highlightFlange:!1,animation:.1},r={...C},B=()=>{const t=performance.now()/1e3*.5,i=new Float32Array([Math.cos(t)*r.animation,Math.sin(t)*r.animation,(2**r.flangeLogSize-1)/2,Number(r.highlightFlange)]);y(m).writeBuffers?y(m).writeBuffers.push({bufferOffset:64,data:i}):M(y(m)).writeBuffers=[{bufferOffset:64,data:i}]},_={addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge",magFilter:"linear",minFilter:"linear",mipmapFilter:"linear",lodMinClamp:0,lodMaxClamp:4,maxAnisotropy:1},S={..._},a=M(S);{const t={initial(){Object.assign(r,C),Object.assign(a,_),o.updateDisplay()},checkerboard(){Object.assign(r,{flangeLogSize:10}),Object.assign(a,{addressModeU:"repeat",addressModeV:"repeat"}),o.updateDisplay()},smooth(){Object.assign(a,{magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"}),o.updateDisplay()},crunchy(){Object.assign(a,{magFilter:"nearest",minFilter:"nearest",mipmapFilter:"nearest"}),o.updateDisplay()}},i=o.addFolder("Presets");i.open(),i.add(t,"initial").name("reset to initial"),i.add(t,"checkerboard").name("checkered floor"),i.add(t,"smooth").name("smooth (linear)"),i.add(t,"crunchy").name("crunchy (nearest)");const s=o.addFolder("Plane settings");s.open(),s.add(r,"flangeLogSize",0,10,.1).name("size = 2**"),s.add(r,"highlightFlange"),s.add(r,"animation",0,.5),o.width=280;{const n=o.addFolder("GPUSamplerDescriptor");n.open();const d=["clamp-to-edge","repeat","mirror-repeat"];n.add(a,"addressModeU",d),n.add(a,"addressModeV",d);const z=["nearest","linear"];n.add(a,"magFilter",z),n.add(a,"minFilter",z);const E=["nearest","linear"];n.add(a,"mipmapFilter",E);const L=n.add(a,"lodMinClamp",0,4,.1),I=n.add(a,"lodMaxClamp",0,4,.1);L.onChange(l=>{a.lodMaxClamp<l&&I.setValue(l)}),I.onChange(l=>{a.lodMinClamp>l&&L.setValue(l)});{const l=n.addFolder('maxAnisotropy (set only if all "linear")');l.open();const $=16;l.add(a,"maxAnisotropy",1,$,1)}}}const v=200,u=4,g=Math.floor(v/u),w=g-2,j=600*devicePixelRatio,R=Math.floor(j/v)*v/devicePixelRatio;p.style.imageRendering="pixelated",p.width=p.height=v,p.style.minWidth=p.style.maxWidth=`${R}px`;const G=await new H().init(),k=4,b=16,T=[[255,255,255,255],[30,136,229,255],[255,193,7,255],[216,27,96,255]],V=[];for(let t=0;t<k;++t){const i=2**(k-t),s=new Uint8Array(i*i*4);for(let n=0;n<i;++n)for(let d=0;d<i;++d)s.set((d+n)%2?T[t]:[0,0,0,255],(n*i+d)*4);V.push({__type__:"TextureDataSource",mipLevel:t,data:s,dataLayout:{width:i},size:[i,i]})}const F={format:"rgba8unorm",size:[b,b],mipLevelCount:4,sources:V},x={vertex:{code:O},fragment:{code:O}},U={vertex:{code:A,constants:{kTextureBaseSize:b,kViewportSize:w}},fragment:{code:A}},D=3,X=e.translate(e.perspective(2*Math.atan(1/D),1,.1,100),[0,0,-D]),m=new Uint8Array(128);M(y(m)).writeBuffers=[{data:X}];const q=J,W={colorAttachments:[{view:{texture:{context:{canvasId:p.id}}},clearValue:[.2,.2,.2,1]}]},f=[],Y={config:{bufferView:m},matrices:{bufferView:q},samp:S,tex:{texture:F}};for(let t=0;t<u**2-1;++t){const i=g*(t%u)+1,s=g*Math.floor(t/u)+1;f.push({viewport:{isYup:!1,x:i,y:s,width:w,height:w,minDepth:0,maxDepth:1},pipeline:U,bindingResources:Y,draw:{__type__:"DrawVertex",vertexCount:6,instanceCount:1,firstVertex:0,firstInstance:t}})}const h={tex:{texture:F}},c=(u-1)*g+1;f.push({viewport:{isYup:!1,x:c,y:c,width:32,height:32,minDepth:0,maxDepth:1},pipeline:x,bindingResources:h,draw:{__type__:"DrawVertex",vertexCount:6,instanceCount:1,firstVertex:0,firstInstance:0}}),f.push({viewport:{isYup:!1,x:c+32,y:c,width:16,height:16,minDepth:0,maxDepth:1},pipeline:x,bindingResources:h,draw:{__type__:"DrawVertex",vertexCount:6,instanceCount:1,firstVertex:0,firstInstance:1}}),f.push({viewport:{isYup:!1,x:c+32,y:c+16,width:8,height:8,minDepth:0,maxDepth:1},pipeline:x,bindingResources:h,draw:{__type__:"DrawVertex",vertexCount:6,instanceCount:1,firstVertex:0,firstInstance:3}}),f.push({viewport:{isYup:!1,x:c+32,y:c+24,width:4,height:4,minDepth:0,maxDepth:1},pipeline:x,bindingResources:h,draw:{__type__:"DrawVertex",vertexCount:6,instanceCount:1,firstVertex:0,firstInstance:2}});const Z={commandEncoders:[{passEncoders:[{descriptor:W,renderPassObjects:f}]}]};function P(){B(),G.submit(Z),requestAnimationFrame(P)}requestAnimationFrame(P)},Q=new N({width:310}),ee=document.getElementById("webgpu");K(ee,Q);
