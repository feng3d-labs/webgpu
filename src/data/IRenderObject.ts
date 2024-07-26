import { IGPURenderObject } from '../webgpu-data-driven/data/IGPURenderObject';
import { IBindingResources } from './IBindingResources';
import { IRenderPipeline } from './IRenderPipeline';
import { IVertexAttributes } from './IVertexAttributes';
import { IIndexBuffer } from './IndexBuffer';

/**
 * 可渲染对象。
 */
export interface IRenderObject extends Omit<IGPURenderObject, 'pipeline' | 'indexBuffer' | 'vertexBuffers' | 'bindGroups'>
{
    pipeline: IRenderPipeline;

    /**
     * 顶点属性数据映射。
     */
    vertices?: IVertexAttributes;

    /**
     * GPU绘制时使用的索引缓冲区。
     */
    index?: IIndexBuffer,

    /**
     * 绑定资源。包含数值、纹理、采样、外部纹理。
     */
    bindingResources?: IBindingResources;
}
