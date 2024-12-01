import { gridIndices, gridJoints, gridVertices } from './gridData';

import { IGPURenderPipeline, IGPUVertexAttributes } from "@feng3d/webgpu-renderer";

// Uses constant grid data to create appropriately sized GPU Buffers for our skinned grid
export const createSkinnedGridBuffers = () =>
{
    // Utility function that creates GPUBuffers from data

    const vertices: IGPUVertexAttributes = {
        vert_pos: { data: gridVertices, numComponents: 2 },
        joints: { data: gridJoints, numComponents: 4 },
        weights: { data: gridIndices, numComponents: 4 },
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
        label: 'SkinnedGridRenderer',
        vertex: {
            code: vertexShader,
        },
        fragment: {
            code: fragmentShader,
        },
        primitive: {
            topology: 'line-list',
        },
    };
    return pipeline;
};
