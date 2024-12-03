import { gridIndices, gridJoints, gridVertices, gridWeights } from "./gridData";

import { IGPURenderPipeline, IGPUVertexAttributes } from "@feng3d/webgpu";

// Uses constant grid data to create appropriately sized GPU Buffers for our skinned grid
export const createSkinnedGridBuffers = () =>
{
    // Utility function that creates GPUBuffers from data

    const vertices: IGPUVertexAttributes = {
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
    const pipeline: IGPURenderPipeline = {
        label: "SkinnedGridRenderer",
        vertex: {
            code: vertexShader,
        },
        fragment: {
            code: fragmentShader,
        },
        primitive: {
            topology: "line-list",
        },
    };

return pipeline;
};
