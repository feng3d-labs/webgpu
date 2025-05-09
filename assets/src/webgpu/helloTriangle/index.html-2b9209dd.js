import"../../../modulepreload-polyfill-3cfb730f.js";import{W as r}from"../../../Buffer-5212487c.js";const c=async t=>{const i=window.devicePixelRatio||1;t.width=t.clientWidth*i,t.height=t.clientHeight*i;const n=await new r().init(),o={commandEncoders:[{passEncoders:[{descriptor:{colorAttachments:[{view:{texture:{context:{canvasId:t.id}}},clearValue:[0,0,0,1]}]},renderPassObjects:[{pipeline:{vertex:{code:`
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
                                    `}},vertices:{position:{data:new Float32Array([0,.5,-.5,-.5,.5,-.5]),format:"float32x2"}},indices:new Uint16Array([0,1,2]),draw:{__type__:"DrawIndexed",indexCount:3},bindingResources:{color:[1,0,0,0]}}]}]}]};n.submit(o)};let e=document.getElementById("webgpu");e||(e=document.createElement("canvas"),e.id="webgpu",e.style.width="400px",e.style.height="300px",document.body.appendChild(e));c(e);
