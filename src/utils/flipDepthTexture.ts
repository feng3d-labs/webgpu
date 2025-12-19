import flipDepthTextureShader from './flipDepthTextureShader.wgsl';

/**
 * 翻转深度纹理的 Y 轴
 *
 * 使用深度渲染通道实现翻转，使 WebGPU 的深度纹理与 WebGL 坐标系一致。
 *
 * @param device GPU 设备
 * @param commandEncoder 命令编码器
 * @param depthTexture 要翻转的深度纹理
 */
export function flipDepthTexture(device: GPUDevice, commandEncoder: GPUCommandEncoder, depthTexture: GPUTexture)
{
    // 初始化着色器模块（懒加载）
    if (!shaderModule)
    {
        shaderModule = device.createShaderModule({ code: flipDepthTextureShader });
    }

    // 获取或创建渲染管线（按深度格式缓存）
    const pipeline = getOrCreatePipeline(device, depthTexture.format);

    // 创建临时深度纹理用于存储原始数据
    const tempTexture = device.createTexture({
        size: { width: depthTexture.width, height: depthTexture.height },
        format: depthTexture.format,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    // 复制原深度纹理到临时纹理
    commandEncoder.copyTextureToTexture(
        { texture: depthTexture },
        { texture: tempTexture },
        { width: depthTexture.width, height: depthTexture.height, depthOrArrayLayers: 1 },
    );

    // 创建绑定组（只需要深度纹理，textureLoad 不需要 sampler）
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: tempTexture.createView(),
            },
        ],
    });

    // 创建深度渲染通道进行翻转
    const renderPassEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
    });

    renderPassEncoder.setPipeline(pipeline);
    renderPassEncoder.setBindGroup(0, bindGroup);
    renderPassEncoder.draw(3);
    renderPassEncoder.end();

    // 延迟销毁临时纹理
    queueMicrotask(() =>
    {
        tempTexture.destroy();
    });
}

/**
 * 获取或创建深度翻转管线（按深度格式缓存）
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
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fsmain',
                targets: [],
            },
            depthStencil: {
                format,
                depthWriteEnabled: true,
                depthCompare: 'always',
            },
            primitive: { topology: 'triangle-list' },
        });
        pipelineCache.set(format, pipeline);
    }

    return pipeline;
}

// 着色器模块（懒加载）
let shaderModule: GPUShaderModule;

// 管线缓存（按深度格式）
const pipelineCache = new Map<GPUTextureFormat, GPURenderPipeline>();
