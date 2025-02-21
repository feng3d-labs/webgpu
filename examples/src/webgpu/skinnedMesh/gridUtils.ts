import { IRenderPipeline, IVertexAttributes } from "@feng3d/render-api";

import { gridIndices, gridJoints, gridVertices, gridWeights } from "./gridData";

// Uses constant grid data to create appropriately sized GPU Buffers for our skinned grid
export const createSkinnedGridBuffers = () =>
{
    // Utility function that creates GPUBuffers from data

    const vertices: IVertexAttributes = {
        vert_pos: { data: gridVertices, format: "float32x2" },
        joints: { data: gridJoints, format: "uint32x4" },
        weights: { data: gridWeights, format: "float32x4" },
    };

    return {
        vertices,
        indices: gridIndices,
    };
};

export const createSkinnedGridRenderPipeline = (
    vertexShader: string,
    fragmentShader: string,
) =>
{
    const pipeline: IRenderPipeline = {
        label: "SkinnedGridRenderer",
        vertex: {
            code: vertexShader,
        },
        fragment: {
            code: fragmentShader,
        },
    };

return pipeline;
};
