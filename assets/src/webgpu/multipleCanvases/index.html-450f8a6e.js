import"../../../modulepreload-polyfill-3cfb730f.js";import{W as G,g as $,r as q}from"../../../Buffer-23ffa079.js";import{v as x,m as b,b as R}from"../../../wgpu-matrix.module-82499b8f.js";import{m as H}from"../../../teapot-c6c08f92.js";import{m as L}from"../../../stanfordDragon-74213251.js";import{c as Y}from"../../../sphere-e20f19ca.js";import"../../../utils-90ee43e9.js";function F(c,l,s=[0,0,0]){const{positions:m,normals:n,triangles:i}=c,f=m.map(e=>e.map((p,v)=>p*l+s[v%3])),r=new Float32Array(f.length*6);for(let e=0;e<f.length;++e)r.set(f[e],6*e),r.set(n[e],6*e+3);const a=new Uint32Array(i.length*3);for(let e=0;e<i.length;++e)a.set(i[e],3*e);return{vertices:r,indices:a}}function P(c,l=32,s=16,m=0){const{vertices:n,indices:i}=Y(c,l,s,m),f=n.length/8,r=new Float32Array(f*6);for(let a=0;a<f;++a){const e=a*8,p=a*6;r.set(n.subarray(e,e+6),p)}return{vertices:r,indices:new Uint32Array(i)}}function S({vertices:c,indices:l}){const s=new Float32Array(l.length*6),m=new Uint32Array(l.length);for(let n=0;n<l.length;n+=3){const i=[];for(let r=0;r<3;++r){const e=l[n+r]*6,p=(n+r)*6,v=c.subarray(e,e+3);s.set(v,p),i.push(v),m[n+r]=n+r}const f=x.normalize(x.cross(x.normalize(x.subtract(i[1],i[0])),x.normalize(x.subtract(i[2],i[1]))));for(let r=0;r<3;++r){const a=(n+r)*6;s.set(f,a+3)}}return{vertices:s,indices:m}}const J={teapot:F(H,1.5),dragon:F(L,.5,[0,-25,0]),sphere:S(P(20)),jewel:S(P(20,5,3)),rock:S(P(20,32,16,.1))};function K({vertices:c,indices:l}){return{vertices:c,indices:l,vertexAttributes:{position:{data:c,format:"float32x3",offset:0,arrayStride:24},normal:{data:c,format:"float32x3",offset:12,arrayStride:24}}}}const Q=async()=>{const c=await new G().init(),l=Object.values(J).map(o=>K(o));function s(o,t){return o===void 0?(t=1,o=0):t===void 0&&(t=o,o=0),Math.random()*(t-o)+o}function m(o,t){return Math.floor(s(o,t))}function n(){return[s(),s(),s(),1]}navigator.gpu.getPreferredCanvasFormat();const i={code:`
    struct Uniforms {
      worldViewProjectionMatrix: mat4x4f,
      worldMatrix: mat4x4f,
      color: vec4f,
    };

    struct Vertex {
      @location(0) position: vec4f,
      @location(1) normal: vec3f,
    };

    struct VSOut {
      @builtin(position) position: vec4f,
      @location(0) normal: vec3f,
    };

    @group(0) @binding(0) var<uniform> uni: Uniforms;

    @vertex fn vs(vin: Vertex) -> VSOut {
      var vOut: VSOut;
      vOut.position = uni.worldViewProjectionMatrix * vin.position;
      vOut.normal = (uni.worldMatrix * vec4f(vin.normal, 0)).xyz;
      return vOut;
    }

    @fragment fn fs(vin: VSOut) -> @location(0) vec4f {
      let lightDirection = normalize(vec3f(4, 10, 6));
      let light = dot(normalize(vin.normal), lightDirection) * 0.5 + 0.5;
      return vec4f(uni.color.rgb * light, uni.color.a);
    }
  `},f={label:"our hardcoded red triangle pipeline",vertex:{...i},fragment:{...i},primitive:{cullFace:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less"}},r=new ResizeObserver(o=>{for(const t of o){const d=t.target,u=t.contentBoxSize[0].inlineSize,h=t.contentBoxSize[0].blockSize;d.width=Math.max(1,Math.min(u,c.device.limits.maxTextureDimension2D)),d.height=Math.max(1,Math.min(h,c.device.limits.maxTextureDimension2D))}}),a=new Set,e=new IntersectionObserver(o=>{for(const{target:t,isIntersecting:d}of o){const u=t;d?a.add(u):a.delete(u)}}),p=document.querySelector("#outer"),v=new Map,T=200;for(let o=0;o<T;++o){const t=document.createElement("canvas");r.observe(t),e.observe(t);const d=document.createElement("div");d.className=`product size${m(4)}`;const u=document.createElement("div");u.textContent=`product#: ${o+1}`,d.appendChild(t),d.appendChild(u),p.appendChild(d),t.id=t.id||`gpuCanvas___${globalThis.gpuCanvasAutoID=~~globalThis.gpuCanvasAutoID+1}`;const h={canvasId:t.id},w=new Float32Array(16+16+4),g=0,V=16,y=32,M=w.subarray(g,g+16),O=w.subarray(V,V+15);w.subarray(y,y+4).set(n());const A={uni:{bufferView:w,worldViewProjectionMatrix:void 0,worldMatrix:void 0,color:void 0}};v.set(t,{context:h,clearValue:n(),worldViewProjectionMatrixValue:M,worldMatrixValue:O,uniformValues:w,bindGroup:A,rotation:s(Math.PI*2),model:l[m(l.length)]})}function C(o){o*=.001;const t=[];a.forEach(u=>{const h=v.get(u),{context:w,uniformValues:g,worldViewProjectionMatrixValue:V,worldMatrixValue:y,bindGroup:M,clearValue:O,rotation:j,model:{vertexAttributes:A,indices:z}}=h,k=h.renderPassDescriptor=h.renderPassDescriptor||{label:"our basic canvas renderPass",colorAttachments:[{view:{texture:{context:w}},clearValue:O,loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:void 0,depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}},B=60*Math.PI/180,N=u.clientWidth/u.clientHeight,U=b.perspective(B,N,.1,100),W=b.lookAt([0,30,50],[0,0,0],[0,1,0]),_=b.multiply(U,W),D=b.rotationY(o*.1+j);b.multiply(_,D,V),R.fromMat4(D,y);const I=$(g),E=I.writeBuffers||[];E.push({data:g}),q(I).writeBuffers=E,t.push({descriptor:k,renderPassObjects:[{pipeline:f,bindingResources:M,vertices:A,indices:z,draw:{__type__:"DrawIndexed",indexCount:z.length}}]})});const d={commandEncoders:[{passEncoders:t}]};c.submit(d),requestAnimationFrame(C)}requestAnimationFrame(C)};Q();
