import { IGPURenderObject } from "./IGPURenderObject";

/**
 * GPU渲染捆绑对象。
 *
 * {@link GPURenderBundleEncoder}
 *
 * {@link GPUDevice.createRenderBundleEncoder}
 */
export interface IGPURenderBundleObject
{
    readonly __type: "IGPURenderBundleObject";

    /**
     * GPU渲染捆绑编码器描述。
     */
    descriptor?: IGPURenderBundleEncoderDescriptor

    /**
     * GPU渲染对象列表。
     */
    renderObjects: IGPURenderObject[];
}

/**
 * GPU渲染捆绑编码器描述。
 *
 * {@link GPURenderBundleEncoderDescriptor}
 *
 * 'colorFormats' | 'depthStencilFormat' | 'sampleCount' 都将从GPU渲染通道中自动获取。
 */
export interface IGPURenderBundleEncoderDescriptor extends Omit<GPURenderBundleEncoderDescriptor, "colorFormats" | "depthStencilFormat" | "sampleCount">
{

}
