import { Computed, computed, reactive } from '@feng3d/reactivity';
import { ChainMap, VertexAttributes, VertexState } from '@feng3d/render-api';
import { WGPUShaderModule } from './WGPUShaderModule';
import { WGPUShaderReflect } from './WGPUShaderReflect';
import { WGPUVertexBufferLayout } from './WGPUVertexBufferLayout';

/**
 * 获取或创建顶点状态实例
 *
 * 使用缓存机制管理顶点状态实例，避免重复创建相同的顶点状态。
 * 当顶点状态配置发生变化时，会自动重新创建对应的GPU顶点状态。
 *
 * @param device GPU设备实例
 * @param vertexState 顶点状态配置对象
 * @param vertices 顶点属性配置对象
 * @returns 顶点状态实例
 */
export function getGPUVertexState(device: GPUDevice, vertexState: VertexState, vertices: VertexAttributes)
{
    device.vertexStates ??= new ChainMap();
    let result = device.vertexStates.get([vertexState, vertices]);
    if (result) return result.value;

    const r_vertexState = reactive(vertexState);

    // 监听顶点状态配置变化，自动重新创建顶点状态
    result = computed(() =>
    {
        // 触发响应式依赖，监听顶点状态的所有属性
        r_vertexState.code;
        r_vertexState.constants;
        r_vertexState.entryPoint;

        // 获取顶点状态配置
        const { code, constants } = vertexState;

        let entryPoint = vertexState.entryPoint;

        // 如果没有指定入口点，自动检测
        if (!entryPoint)
        {
            entryPoint = WGPUShaderReflect.getWGSLReflectInfo(code).entry.vertex[0].name;
        }

        // 获取着色器模块
        const module = WGPUShaderModule.getGPUShaderModule(device, code);

        // 创建GPU顶点状态配置
        const gpuVertexState: GPUVertexState = {
            module: module,
            entryPoint: entryPoint,
            constants: constants,
        };

        if (vertices)
        {
            // 获取顶点缓冲区布局配置
            const wgpuVertexBufferLayout = WGPUVertexBufferLayout.getInstance(vertexState, vertices);
            reactive(wgpuVertexBufferLayout).vertexBufferLayouts;
            gpuVertexState.buffers = wgpuVertexBufferLayout.vertexBufferLayouts;
        }

        return gpuVertexState;
    });

    device.vertexStates.set([vertexState, vertices], result);

    return result.value;
}

/**
 * 全局类型声明
 *
 * 扩展GPUDevice接口，添加顶点状态实例缓存映射。
 * 使用ChainMap缓存顶点状态实例，避免重复创建相同的顶点状态。
 */
declare global
{
    interface GPUDevice
    {
        /** 顶点状态实例缓存映射表 */
        vertexStates: ChainMap<[vertexState: VertexState, vertices: VertexAttributes], Computed<GPUVertexState>>;
    }
}