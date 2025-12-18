import textureInvertYPremultiplyAlpha_wgsl from './textureInvertYPremultiplyAlpha.wgsl';

/**
 * 翻转 RTT 纹理的 Y 轴（使用已有的 commandEncoder）
 *
 * 用于在渲染通道结束后立即翻转纹理，使 WebGPU 的 RTT 结果与 WebGL 坐标系一致。
 *
 * @param device GPU 设备
 * @param commandEncoder 命令编码器
 * @param texture 要翻转的纹理
 */
export function flipRTTTexture(device: GPUDevice, commandEncoder: GPUCommandEncoder, texture: GPUTexture)
{
    // 初始化着色器模块（懒加载）
    if (!shaderModule)
    {
        shaderModule = device.createShaderModule({ code: textureInvertYPremultiplyAlpha_wgsl });
    }

    // 获取或创建渲染管线（按纹理格式缓存）
    const pipeline = getOrCreatePipeline(device, texture.format);

    // 同一个纹理不能同时作为输入与输出，需要复制一份临时纹理作为输入
    const tempTexture = device.createTexture({
        size: { width: texture.width, height: texture.height },
        format: texture.format,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // 复制原纹理到临时纹理
    commandEncoder.copyTextureToTexture(
        { texture },
        { texture: tempTexture },
        { width: texture.width, height: texture.height },
    );

    // 创建绑定组
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: device.createSampler({
                    magFilter: 'linear',
                    minFilter: 'linear',
                }),
            },
            {
                binding: 1,
                resource: tempTexture.createView(),
            },
        ],
    });

    // 创建渲染通道进行翻转
    const renderPassEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
            {
                view: texture.createView(),
                loadOp: 'load',
                storeOp: 'store',
            },
        ],
    });

    renderPassEncoder.setPipeline(pipeline);
    renderPassEncoder.setBindGroup(0, bindGroup);
    renderPassEncoder.draw(4);
    renderPassEncoder.end();

    // 注册临时纹理销毁（在命令提交后销毁）
    // 使用 queueMicrotask 确保在当前帧结束后销毁
    queueMicrotask(() =>
    {
        tempTexture.destroy();
    });
}

/**
 * 获取或创建翻转管线（按纹理格式缓存）
 */
function getOrCreatePipeline(device: GPUDevice, format: GPUTextureFormat): GPURenderPipeline
{
    let pipeline = pipelineCache.get(format);
    if (!pipeline)
    {
        pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: 'vsmain',
                constants: {
                    invertY: 1, // 始终翻转 Y 轴
                },
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fsmain',
                constants: {
                    premultiplyAlpha: 0, // 不预乘 Alpha
                },
                targets: [{ format }],
            },
            primitive: { topology: 'triangle-strip' },
        });
        pipelineCache.set(format, pipeline);
    }

    return pipeline;
}

// 着色器模块（懒加载）
let shaderModule: GPUShaderModule;

// 管线缓存（按纹理格式）
const pipelineCache = new Map<GPUTextureFormat, GPURenderPipeline>();
