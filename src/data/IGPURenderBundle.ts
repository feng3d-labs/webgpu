import { IGPURenderObject } from "./IGPURenderObject";

/**
 * GPU渲染捆绑对象。
 *
 * {@link GPURenderBundleEncoder}
 *
 * {@link GPUDevice.createRenderBundleEncoder}
 */
export interface IGPURenderBundle
{
    /**
     * 数据类型。
     */
    readonly __type: "RenderBundle";

    /**
     * GPU渲染捆绑编码器描述。
     */
    readonly descriptor?: IGPURenderBundleEncoderDescriptor

    /**
     * GPU渲染对象列表。
     */
    renderObjects: readonly IGPURenderObject[];
}

/**
 * GPU渲染捆绑编码器描述。
 *
 * {@link GPURenderBundleEncoderDescriptor}
 *
 * 'colorFormats' | 'depthStencilFormat' | 'sampleCount' 都将从GPU渲染通道中自动获取。
 */
export interface IGPURenderBundleEncoderDescriptor
{
    /**
     * If `true`, indicates that the render bundle does not modify the depth component of the
     * {@link GPURenderPassDepthStencilAttachment} of any render pass the render bundle is executed
     * in.
     * See read-only depth-stencil.
     */
    readonly depthReadOnly?: boolean;

    /**
     * If `true`, indicates that the render bundle does not modify the stencil component of the
     * {@link GPURenderPassDepthStencilAttachment} of any render pass the render bundle is executed
     * in.
     * See read-only depth-stencil.
     */
    readonly stencilReadOnly?: boolean;
}
