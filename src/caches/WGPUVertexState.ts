import { reactive } from '@feng3d/reactivity';
import { VertexAttributes, VertexState } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUShaderModule } from './WGPUShaderModule';
import { WGPUShaderReflect } from './WGPUShaderReflect';
import { WGPUVertexBufferLayout } from './WGPUVertexBufferLayout';

/**
 * WebGPU顶点状态缓存管理器
 *
 * 负责管理WebGPU顶点状态的完整生命周期，包括：
 * - 顶点状态的创建和配置
 * - 响应式监听顶点状态参数变化
 * - 自动重新创建顶点状态当依赖变化时
 * - 顶点着色器模块和顶点缓冲区布局的自动管理
 * - 顶点状态实例的缓存和复用
 * - 资源清理和内存管理
 *
 * 主要功能：
 * 1. **顶点状态管理** - 自动创建和配置GPU顶点状态
 * 2. **着色器管理** - 自动处理顶点着色器模块的创建和编译
 * 3. **缓冲区布局管理** - 自动生成和管理顶点缓冲区布局
 * 4. **入口点检测** - 自动检测顶点着色器入口点
 * 5. **响应式更新** - 监听顶点状态参数变化，自动重新创建
 * 6. **实例缓存** - 使用WeakMap缓存顶点状态实例，避免重复创建
 * 7. **资源管理** - 自动处理顶点状态相关资源的清理
 *
 * 使用场景：
 * - 渲染管线中的顶点处理
 * - 顶点着色器执行
 * - 顶点数据格式定义
 * - 顶点缓冲区布局配置
 * - 多顶点格式的渲染管理
 */
export class WGPUVertexState extends ReactiveObject
{
    /**
     * WebGPU顶点状态对象
     *
     * 这是实际的GPU顶点状态实例，用于定义顶点着色器的执行配置。
     * 当顶点状态配置发生变化时，此对象会自动重新创建。
     */
    readonly gpuVertexState: GPUVertexState;

    /**
     * 构造函数
     *
     * 创建顶点状态管理器实例，并设置响应式监听。
     *
     * @param device GPU设备实例，用于创建顶点状态
     * @param vertexState 顶点状态配置对象，包含着色器代码和参数
     * @param vertices 顶点属性配置对象，定义顶点数据格式
     */
    constructor(device: GPUDevice, vertexState: VertexState, vertices: VertexAttributes)
    {
        super();

        // 设置顶点状态创建和更新逻辑
        this._onCreateVertexState(device, vertexState, vertices);

        // 将实例注册到设备缓存中
        this._onMap(device, vertexState, vertices);
    }

    /**
     * 设置顶点状态创建和更新逻辑
     *
     * 使用响应式系统监听顶点状态配置变化，自动重新创建顶点状态。
     * 当顶点状态参数发生变化时，会触发顶点状态的重新创建。
     * 自动处理着色器模块、缓冲区布局和入口点的管理。
     *
     * @param device GPU设备实例
     * @param vertexState 顶点状态配置对象
     * @param vertices 顶点属性配置对象
     */
    private _onCreateVertexState(device: GPUDevice, vertexState: VertexState, vertices: VertexAttributes)
    {
        const r_this = reactive(this);
        const r_vertexState = reactive(vertexState);

        // 监听顶点状态配置变化，自动重新创建顶点状态
        this.effect(() =>
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

            //
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
                gpuVertexState.buffers = wgpuVertexBufferLayout.vertexBufferLayouts;
            }

            // 更新顶点状态引用
            r_this.gpuVertexState = gpuVertexState;
        });

        // 注册销毁回调，确保在对象销毁时清理顶点状态
        this.destroyCall(() => { r_this.gpuVertexState = null; });
    }

    /**
     * 将顶点状态实例注册到设备缓存中
     *
     * 使用嵌套WeakMap将顶点状态和顶点属性配置对象与其实例关联，实现实例缓存和复用。
     * 当顶点状态或顶点属性配置对象被垃圾回收时，WeakMap会自动清理对应的缓存条目。
     *
     * @param device GPU设备实例，用于存储缓存映射
     * @param vertexState 顶点状态配置对象，作为第一级缓存的键
     * @param vertices 顶点属性配置对象，作为第二级缓存的键
     */
    private _onMap(device: GPUDevice, vertexState: VertexState, vertices: VertexAttributes)
    {
        // 如果设备还没有顶点状态缓存，则创建一个新的嵌套WeakMap
        device.vertexStates ??= new WeakMap<VertexState, Map<VertexAttributes, WGPUVertexState>>();

        // 获取或创建顶点状态对应的二级缓存
        let vertexStates = device.vertexStates.get(vertexState);
        if (!vertexStates)
        {
            vertexStates = new Map<VertexAttributes, WGPUVertexState>();
            device.vertexStates.set(vertexState, vertexStates);
        }

        // 将当前实例与顶点属性配置对象关联
        vertexStates.set(vertices, this);

        // 注册清理回调，在对象销毁时从缓存中移除
        this.destroyCall(() => { device.vertexStates.get(vertexState).delete(vertices); });
    }

    /**
     * 获取或创建顶点状态实例
     *
     * 使用单例模式管理顶点状态实例，避免重复创建相同的顶点状态。
     * 如果缓存中已存在对应的实例，则直接返回；否则创建新实例并缓存。
     *
     * @param device GPU设备实例
     * @param vertexState 顶点状态配置对象
     * @param vertices 顶点属性配置对象
     * @returns 顶点状态实例
     */
    static getInstance(device: GPUDevice, vertexState: VertexState, vertices: VertexAttributes)
    {
        // 尝试从缓存中获取现有实例，如果不存在则创建新实例
        return device.vertexStates?.get(vertexState)?.get(vertices) || new WGPUVertexState(device, vertexState, vertices);
    }
}

/**
 * 全局类型声明
 *
 * 扩展GPUDevice接口，添加顶点状态实例缓存映射。
 * 这个嵌套WeakMap用于缓存顶点状态实例，避免重复创建相同的顶点状态。
 * 第一级键为顶点状态配置对象，第二级键为顶点属性配置对象。
 */
declare global
{
    interface GPUDevice
    {
        /** 顶点状态实例缓存映射表，嵌套WeakMap结构 */
        vertexStates: WeakMap<VertexState, Map<VertexAttributes, WGPUVertexState>>;
    }
}