import"../../../modulepreload-polyfill-3cfb730f.js";import{W as d,r as n}from"../../../Buffer-23ffa079.js";const s=async i=>{const t=window.devicePixelRatio||1;i.width=i.clientWidth*t,i.height=i.clientHeight*t;const c=await new d().init(),o={pipeline:{vertex:{code:`
                @vertex
                fn main(
                    @location(0) position: vec2<f32>,
                ) -> @builtin(position) vec4<f32> {
                    return vec4<f32>(position, 0.0, 1.0);
                }
                `},fragment:{code:`
                    @binding(0) @group(0) var<uniform> color : vec4<f32>;
                    @fragment
                    fn main() -> @location(0) vec4f {
                        return color;
                    }
                `}},vertices:{position:{data:new Float32Array([0,.5,-.5,-.5,.5,-.5]),format:"float32x2"}},indices:new Uint16Array([0,1,2]),draw:{__type__:"DrawIndexed",indexCount:3},bindingResources:{color:[1,0,0,0]}},a={commandEncoders:[{passEncoders:[{descriptor:{colorAttachments:[{view:{texture:{context:{canvasId:i.id}}},clearValue:[0,0,0,1]}]},renderPassObjects:[o]}]}]};function r(){c.submit(a),requestAnimationFrame(r)}r(),window.onclick=()=>{n(o.pipeline.vertex).code=`
                @vertex
                fn main(
                    @location(0) position: vec2<f32>,
                ) -> @builtin(position) vec4<f32> {
                    var pos = position;
                    pos.x = pos.x + 0.5;
                    return vec4<f32>(pos, 0.0, 1.0);
                }
                `,n(o.pipeline.fragment).code=`
                @binding(0) @group(0) var<uniform> color : vec4<f32>;
                @fragment
                fn main() -> @location(0) vec4f {
                    var col = color;
                    col.x = 0.5;
                    col.y = 0.6;
                    col.z = 0.7;
                    return col;
                }
                `,n(o.bindingResources).color=[0,1,0,1]}};let e=document.getElementById("webgpu");e||(e=document.createElement("canvas"),e.id="webgpu",e.style.width="400px",e.style.height="300px",document.body.appendChild(e));s(e);
