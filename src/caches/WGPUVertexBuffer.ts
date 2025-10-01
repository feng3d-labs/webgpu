import { reactive } from '@feng3d/reactivity';
import { VertexAttribute } from '@feng3d/render-api';
import { VertexBuffer } from '../internal/VertexBuffer';
import { ReactiveObject } from '../ReactiveObject';

/**
 * WebGPU顶点缓冲区缓存管理器
 *
 * 负责管理WebGPU顶点缓冲区的完整生命周期，包括：
 * - 顶点缓冲区的创建和配置
 * - 响应式监听顶点属性数据变化
 * - 自动重新创建顶点缓冲区当依赖变化时
 * - 顶点缓冲区实例的缓存和复用
 * - 资源清理和内存管理
 *
 * 主要功能：
 * 1. **顶点缓冲区管理** - 自动创建和配置GPU顶点缓冲区
 * 2. **数据监听** - 响应式监听顶点属性数据变化
 * 3. **响应式更新** - 监听顶点属性参数变化，自动重新创建
 * 4. **实例缓存** - 使用WeakMap缓存顶点缓冲区实例，避免重复创建
 * 5. **资源管理** - 自动处理顶点缓冲区相关资源的清理
 *
 * 使用场景：
 * - 渲染管线中的顶点数据处理
 * - 顶点数据的动态更新
 * - 顶点缓冲区格式转换
 * - 多顶点格式的渲染管理
 */
export class WGPUVertexBuffer extends ReactiveObject
{
    /**
     * 顶点缓冲区对象
     *
     * 这是实际的顶点缓冲区实例，包含顶点数据和相关配置信息。
     * 当顶点属性数据发生变化时，此对象会自动重新创建。
     */
    readonly vertexBuffer: VertexBuffer;

    /**
     * 构造函数
     *
     * 创建顶点缓冲区管理器实例，并设置响应式监听。
     *
     * @param vertexAttribute 顶点属性配置对象，包含顶点数据和格式信息
     */
    constructor(vertexAttribute: VertexAttribute)
    {
        super();

        // 设置顶点缓冲区创建和更新逻辑
        this._onCreateVertexBuffer(vertexAttribute);

        // 将实例注册到缓存中
        this._onMap(vertexAttribute);
    }

    /**
     * 设置顶点缓冲区创建和更新逻辑
     *
     * 使用响应式系统监听顶点属性数据变化，自动重新创建顶点缓冲区。
     * 当顶点属性数据发生变化时，会触发顶点缓冲区的重新创建。
     *
     * @param vertexAttribute 顶点属性配置对象
     */
    private _onCreateVertexBuffer(vertexAttribute: VertexAttribute)
    {
        const r_this = reactive(this);
        const r_vertexAttribute = reactive(vertexAttribute);

        // 监听顶点属性数据变化，自动重新创建顶点缓冲区
        this.effect(() =>
        {
            // 触发响应式依赖，监听顶点属性数据
            r_vertexAttribute.data;

            // 获取顶点属性数据
            const data = vertexAttribute.data;

            // 创建顶点缓冲区配置
            const vertexBuffer: VertexBuffer = {
                data,
                offset: data.byteOffset,
                size: data.byteLength,
            };

            // 更新顶点缓冲区引用
            r_this.vertexBuffer = vertexBuffer;
        });
    }

    /**
     * 将顶点缓冲区实例注册到缓存中
     *
     * 使用WeakMap将顶点属性配置对象与其实例关联，实现实例缓存和复用。
     * 当顶点属性配置对象被垃圾回收时，WeakMap会自动清理对应的缓存条目。
     *
     * @param vertexAttribute 顶点属性配置对象，作为缓存的键
     */
    private _onMap(vertexAttribute: VertexAttribute)
    {
        // 将当前实例与顶点属性配置对象关联
        caches.set(vertexAttribute, this);

        // 注册清理回调，在对象销毁时从缓存中移除
        this.destroyCall(() => { caches.delete(vertexAttribute); });
    }

    /**
     * 获取或创建顶点缓冲区实例
     *
     * 使用单例模式管理顶点缓冲区实例，避免重复创建相同的顶点缓冲区。
     * 如果缓存中已存在对应的实例，则直接返回；否则创建新实例并缓存。
     *
     * @param vertexAttribute 顶点属性配置对象
     * @returns 顶点缓冲区实例
     */
    static getInstance(vertexAttribute: VertexAttribute)
    {
        // 尝试从缓存中获取现有实例，如果不存在则创建新实例
        return caches.get(vertexAttribute) || new WGPUVertexBuffer(vertexAttribute);
    }
}

/**
 * 顶点缓冲区实例缓存映射表
 *
 * 用于缓存已创建的顶点缓冲区实例，避免重复创建相同的顶点缓冲区。
 * 键为顶点属性配置对象，值为顶点缓冲区实例。
 */
const caches = new WeakMap<VertexAttribute, WGPUVertexBuffer>();