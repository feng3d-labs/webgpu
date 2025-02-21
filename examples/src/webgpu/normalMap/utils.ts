import { DepthStencilState, Material, Texture } from "@feng3d/render-api";

export const create3DRenderPipeline = (
    label: string,
    vertexShader: string,
    fragmentShader: string,
    depthTest = false,
) =>
{
    let depthStencil: DepthStencilState;
    if (depthTest)
    {
        depthStencil = {
            depthCompare: "less",
            depthWriteEnabled: true,
        };
    }

    const pipelineDescriptor: Material = {
        label: `${label}.pipeline`,
        vertex: {
            code: vertexShader,
        },
        fragment: {
            code: fragmentShader,
        },
        depthStencil,
    };

    return pipelineDescriptor;
};

export const createTextureFromImage = (
    bitmap: ImageBitmap
) =>
{
    const texture: Texture = {
        size: [bitmap.width, bitmap.height],
        format: "rgba8unorm",
        sources: [{ image: bitmap }]
    };

    return texture;
};
