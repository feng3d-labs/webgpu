import"../../../modulepreload-polyfill-3cfb730f.js";import{G as ot}from"../../../dat.gui.module-5ea4ba08.js";import{m as Q}from"../../../wgpu-matrix.module-82499b8f.js";import{W as at,r as p}from"../../../Buffer-5212487c.js";const y=`struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

struct Uniforms {
  matrix: mat4x4f,
};

@group(0) @binding(2) var<uniform> uni: Uniforms;

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> OurVertexShaderOutput {
  let pos = array(

    vec2f( 0.0,  0.0),  // center
    vec2f( 1.0,  0.0),  // right, center
    vec2f( 0.0,  1.0),  // center, top

    // 2st triangle
    vec2f( 0.0,  1.0),  // center, top
    vec2f( 1.0,  0.0),  // right, center
    vec2f( 1.0,  1.0),  // right, top
  );

  var vsOutput: OurVertexShaderOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = uni.matrix * vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy;
  return vsOutput;
}

@group(0) @binding(0) var ourSampler: sampler;
@group(0) @binding(1) var ourTexture: texture_2d<f32>;

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
}`,nt=async(c,n)=>{const Y=(t,r,e)=>`hsl(${t*360|0}, ${r*100}%, ${e*100|0}%)`,B=(t,r,e,o)=>`hsla(${t*360|0}, ${r*100}%, ${e*100|0}%, ${o})`;function J(t){const r=document.createElement("canvas");r.width=t,r.height=t;const e=r.getContext("2d");e.translate(t/2,t/2),e.globalCompositeOperation="screen";const o=3;for(let a=0;a<o;++a){e.rotate(Math.PI*2/o),e.save(),e.translate(t/6,0),e.beginPath();const s=t/3;e.arc(0,0,s,0,Math.PI*2);const h=e.createRadialGradient(0,0,s/2,0,0,s),i=a/o;h.addColorStop(.5,B(i,1,.5,1)),h.addColorStop(1,B(i,1,.5,0)),e.fillStyle=h,e.fill(),e.restore()}return r}function K(t){const r=document.createElement("canvas");r.width=t,r.height=t;const e=r.getContext("2d"),o=e.createLinearGradient(0,0,t,t);for(let a=0;a<=6;++a)o.addColorStop(a/6,Y(a/-6,1,.5));e.fillStyle=o,e.fillRect(0,0,t,t),e.fillStyle="rgba(0, 0, 0, 255)",e.globalCompositeOperation="destination-out",e.rotate(Math.PI/-4);for(let a=0;a<t*2;a+=32)e.fillRect(-t,a,t*2,16);return r}const U=300,I=J(U),_=K(U),x=window.devicePixelRatio||1;c.width=c.clientWidth*x,c.height=c.clientHeight*x;const M={canvasId:c.id,configuration:{}},N={texture:{context:M}},X=await new at().init();function f(t,r={}){const{flipY:e,premultipliedAlpha:o}=r;return{format:"rgba8unorm",size:[t.width,t.height],sources:[{image:t,flipY:e,premultipliedAlpha:o}]}}const $=f(I),j=f(_),R=f(I,{premultipliedAlpha:!0}),V=f(_,{premultipliedAlpha:!0}),F={magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"},G={matrix:new Float32Array(16)},A={matrix:new Float32Array(16)},Z=[{srcTexture:R,dstTexture:V,srcBindGroup:{ourSampler:F,ourTexture:{texture:R},uni:G},dstBindGroup:{ourSampler:F,ourTexture:{texture:V},uni:A}},{srcTexture:$,dstTexture:j,srcBindGroup:{ourSampler:F,ourTexture:{texture:$},uni:G},dstBindGroup:{ourSampler:F,ourTexture:{texture:j},uni:A}}],u=[0,0,0,0],tt={label:"our basic canvas renderPass",colorAttachments:[{view:N,clearValue:u,loadOp:"clear",storeOp:"store"}]},E=["add","subtract","reverse-subtract","min","max"],v=["zero","one","src","one-minus-src","src-alpha","one-minus-src-alpha","dst","one-minus-dst","dst-alpha","one-minus-dst-alpha","src-alpha-saturated","constant","one-minus-constant"],D={"default (copy)":{color:{operation:"add",srcFactor:"one",dstFactor:"zero"}},"premultiplied blend (source-over)":{color:{operation:"add",srcFactor:"one",dstFactor:"one-minus-src-alpha"}},"un-premultiplied blend":{color:{operation:"add",srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha"}},"destination-over":{color:{operation:"add",srcFactor:"one-minus-dst-alpha",dstFactor:"one"}},"source-in":{color:{operation:"add",srcFactor:"dst-alpha",dstFactor:"zero"}},"destination-in":{color:{operation:"add",srcFactor:"zero",dstFactor:"src-alpha"}},"source-out":{color:{operation:"add",srcFactor:"one-minus-dst-alpha",dstFactor:"zero"}},"destination-out":{color:{operation:"add",srcFactor:"zero",dstFactor:"one-minus-src-alpha"}},"source-atop":{color:{operation:"add",srcFactor:"dst-alpha",dstFactor:"one-minus-src-alpha"}},"destination-atop":{color:{operation:"add",srcFactor:"one-minus-dst-alpha",dstFactor:"src-alpha"}},"additive (lighten)":{color:{operation:"add",srcFactor:"one",dstFactor:"one"}}},l=p({color:[1,.5,.25],alpha:1}),g={color:[0,0,0],alpha:0,premultiply:!0},d={alphaMode:"premultiplied",textureSet:"premultiplied alpha",preset:"premultiplied blend (source-over)"};class q{constructor(r){this.normalizedColor=r}get value(){return this.normalizedColor.map(r=>Math.round(r*255))}set value(r){this.normalizedColor.forEach((e,o)=>this.normalizedColor[o]=r[o]/255)}}const m=[0,0,0,0],P={label:"hardcoded textured quad pipeline",vertex:{code:y},fragment:{code:y,targets:[{blend:{constantColor:m,color:{operation:"add",srcFactor:"one",dstFactor:"one-minus-src"},alpha:{operation:"add",srcFactor:"one",dstFactor:"one-minus-src"}}}]}},b=p(P.fragment.targets[0].blend.color),w=p(P.fragment.targets[0].blend.alpha);function W(){const t=D[d.preset];Object.assign(b,t.color),Object.assign(w,t.alpha||t.color)}n.add(d,"alphaMode",["opaque","premultiplied"]).name("canvas alphaMode"),n.add(d,"textureSet",["premultiplied alpha","un-premultiplied alpha"]).name("texture data"),n.add(d,"preset",[...Object.keys(D)]).onChange(()=>{W()});const S=n.addFolder("color");S.open(),S.add(b,"operation",E),S.add(b,"srcFactor",v),S.add(b,"dstFactor",v);const C=n.addFolder("alpha");C.open(),C.add(w,"operation",E),C.add(w,"srcFactor",v),C.add(w,"dstFactor",v);const T=n.addFolder("constant");T.open(),T.addColor(new q(l.color),"value").name("color"),T.add(l,"alpha",0,1);const O=n.addFolder("clear color");O.open(),O.add(g,"premultiply"),O.add(g,"alpha",0,1),O.addColor(new q(g.color),"value");const et={label:"hardcoded textured quad pipeline",vertex:{code:y},fragment:{code:y}};function H(t,r,e){const o=Q.ortho(0,r.width/x,r.height/x,0,-1,1);Q.scale(o,[e.size[0],e.size[1],1],t.matrix),t.matrix=new Float32Array(t.matrix)}const L={pipeline:et,draw:{__type__:"DrawVertex",vertexCount:6}},k={pipeline:P,draw:{__type__:"DrawVertex",vertexCount:6}},rt={commandEncoders:[{passEncoders:[{descriptor:tt,renderPassObjects:[L,k]}]}]};function z(){n.updateDisplay();const{srcTexture:t,dstTexture:r,srcBindGroup:e,dstBindGroup:o}=Z[d.textureSet==="premultiplied alpha"?0:1];p(L).bindingResources=o,p(k).bindingResources=e,p(M.configuration).alphaMode=d.alphaMode;{const{alpha:a,color:s,premultiply:h}=g,i=h?a:1;u[0]=s[0]*i,u[1]=s[1]*i,u[2]=s[2]*i,u[3]=a}m[0]=l.color[0],m[1]=l.color[1],m[2]=l.color[2],m[3]=l.alpha,H(G,c,t),H(A,c,r),X.submit(rt),requestAnimationFrame(z)}W(),z()},ct=new ot({width:310}),st=document.getElementById("webgpu");nt(st,ct);
