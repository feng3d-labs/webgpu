import { IGPUDepthStencilState, IGPURenderPipeline, IGPUTexture } from "@feng3d/webgpu";

export const create3DRenderPipeline = (
    label: string,
    vertexShader: string,
    fragmentShader: string,
    depthTest = false,
    topology: GPUPrimitiveTopology = "triangle-list",
    cullMode: GPUCullMode = "back"
) =>
{
    let depthStencil: IGPUDepthStencilState;
    if (depthTest)
    {
        depthStencil = {
            depthCompare: "less",
            depthWriteEnabled: true,
        };
    }

    const pipelineDescriptor: IGPURenderPipeline = {
        label: `${label}.pipeline`,
        vertex: {
            code: vertexShader,
        },
        fragment: {
            code: fragmentShader,
        },
        primitive: {
            topology,
            cullMode,
        },
        depthStencil,
    };

    return pipelineDescriptor;
};

export const createTextureFromImage = (
    bitmap: ImageBitmap
) =>
{
    const texture: IGPUTexture = {
        size: [bitmap.width, bitmap.height, 1],
        format: "rgba8unorm",
        source: [{ source: { source: bitmap }, destination: {} }]
    };

    return texture;
};
