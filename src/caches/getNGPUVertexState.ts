import { ChainMap, ComputedRef, VertexAttributes, VertexState, computed } from "@feng3d/render-api";
import { getGPUShaderModule } from "./getGPUShaderModule";
import { getGPUVertexBufferLayouts } from "./getNGPUVertexBuffers";
import { getVertexEntryFunctionInfo } from "./getVertexEntryFunctionInfo";

/**
 * 获取完整的顶点阶段描述与顶点缓冲区列表。
 *
 * @param vertexState 顶点阶段信息。
 * @param vertices 顶点数据。
 * @returns 完整的顶点阶段描述与顶点缓冲区列表。
 */
export function getNGPUVertexState(device: GPUDevice, vertexState: VertexState, vertices: VertexAttributes)
{
    let result = vertexStateMap.get([vertexState, vertices]);
    if (result) return result.value;

    result = computed(() =>
    {
        const vertexEntryFunctionInfo = getVertexEntryFunctionInfo(vertexState);
        const vertexBufferLayouts = getGPUVertexBufferLayouts(vertexState, vertices);

        const gpuVertexState: GPUVertexState = {
            module: getGPUShaderModule(device, vertexState.code),
            entryPoint: vertexEntryFunctionInfo.name,
            buffers: vertexBufferLayouts,
            constants: vertexState.constants,
        };

        return gpuVertexState;
    });
    vertexStateMap.set([vertexState, vertices], result);

    return result.value;
}

const vertexStateMap = new ChainMap<[VertexState, VertexAttributes], ComputedRef<GPUVertexState>>();
