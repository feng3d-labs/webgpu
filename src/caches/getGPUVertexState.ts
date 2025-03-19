import { ChainMap, VertexAttributes, VertexState, computed, reactive } from "@feng3d/render-api";
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
export function getGPUVertexState(device: GPUDevice, vertexState: VertexState, vertices: VertexAttributes)
{
    const _GPUVertexStateMap_key: [vertexState: VertexState, vertices: VertexAttributes] = [vertexState, vertices];
    let result = device._GPUVertexStateMap.get(_GPUVertexStateMap_key);
    if (result) return result.value;

    result = computed(() =>
    {
        // 监听
        const r_vertexState = reactive(vertexState);
        r_vertexState.code;

        // 计算
        const { code } = vertexState;

        const vertexEntryFunctionInfo = getVertexEntryFunctionInfo(vertexState);
        const vertexBufferLayouts = getGPUVertexBufferLayouts(vertexState, vertices);

        const gpuVertexState: GPUVertexState = {
            module: getGPUShaderModule(device, code),
            entryPoint: vertexEntryFunctionInfo.name,
            buffers: vertexBufferLayouts,
            constants: vertexState.constants,
        };

        // 缓存
        const key: _GPUVertexStateMapKey = [gpuVertexState.module, gpuVertexState.entryPoint, gpuVertexState.buffers, gpuVertexState.constants];
        const cache = _GPUVertexStateMap.get(key);
        if (cache) return cache;
        _GPUVertexStateMap.set(key, gpuVertexState);

        return gpuVertexState;
    });
    device._GPUVertexStateMap.set(_GPUVertexStateMap_key, result);

    return result.value;
}
type _GPUVertexStateMapKey = [module: GPUShaderModule, entryPoint?: string, buffers?: Iterable<GPUVertexBufferLayout>, constants?: Record<string, number>]
const _GPUVertexStateMap = new ChainMap<_GPUVertexStateMapKey, GPUVertexState>();