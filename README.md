# webgpu-simplify

## 暂未实现功能
1. GPUBufferBindingLayout.hasDynamicOffset
2. WGSL解析过程中只统计了WGSL中包含的绑定组，并没有区分属于顶点、片元或者计算阶段，因此以下情况或许无法处理。
   1. WGSL中出现相同 @binding(b) @group(g) 的情况。
   2. WGSL中出现相同 名称 资源绑定 的情况。
   3. WGSL同时存在渲染与计算着色程序的情况。

## 参考
1. https://github.com/webgpu/webgpu-samples
2. https://www.orillusion.com/zh/webgpu.html
3. https://www.orillusion.com/zh/wgsl.html
4. https://gpuweb.github.io/gpuweb/
5. https://gpuweb.github.io/gpuweb/wgsl/
6. https://github.com/Orillusion/orillusion/tree/main/src/gfx/graphics/webGpu
7. https://github.com/mrdoob/three.js/tree/dev/examples/jsm/renderers/webgpu
8. https://github.com/regl-project/regl
9. https://github.com/regl-project/regl/blob/master/example/basic.js
10. https://github.com/stackgpu/Simple-GPU
11. https://github.com/antvis/G/blob/next/packages/g-plugin-webgpu-device/src/platform/Program.ts
12. https://github.com/dtysky/webgpu-renderer
13. WGSL反射。 https://github.com/brendan-duncan/wgsl_reflect
14. https://github.com/greggman/webgpu-avoid-redundant-state-setting
    1.  避免调用WebGPU中的冗余状态。
15. https://github.com/greggman/webgpu-utils
    1.  webgpu一些工具。
16. https://github.com/GEngine-js/GEngine