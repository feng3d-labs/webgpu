import { IDepthStencilState, IRenderPipeline, ITexture } from "@feng3d/render-api";

export const create3DRenderPipeline = (
    label: string,
    vertexShader: string,
    fragmentShader: string,
    depthTest = false,
    topology: GPUPrimitiveTopology = "triangle-list",
    cullMode: GPUCullMode = "back"
) =>
{
    let depthStencil: IDepthStencilState;
    if (depthTest)
    {
        depthStencil = {
            depthCompare: "less",
            depthWriteEnabled: true,
        };
    }

    const pipelineDescriptor: IRenderPipeline = {
        label: `${label}.pipeline`,
        vertex: {
            code: vertexShader,
        },
        fragment: {
            code: fragmentShader,
        },
        primitive: {
            topology,
            cullFace: cullMode,
        },
        depthStencil,
    };

    return pipelineDescriptor;
};

export const createTextureFromImage = (
    bitmap: ImageBitmap
) =>
{
    const texture: ITexture = {
        size: [bitmap.width, bitmap.height],
        format: "rgba8unorm",
        sources: [{ image: bitmap }]
    };

    return texture;
};
