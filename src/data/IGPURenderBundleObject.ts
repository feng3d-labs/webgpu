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
    /**
     * GPU渲染捆绑编码器描述。
     */
    renderBundle: IGPURenderBundleEncoderDescriptor

    /**
     * GPU渲染对象列表。
     */
    renderObjects: IGPURenderObject[];

    /**
     * @private
     */
    _GPURenderBundle?: GPURenderBundle;
}

/**
 * GPU渲染捆绑编码器描述。
 *
 * {@link GPURenderBundleEncoderDescriptor}
 * {@link GPUDevice.createRenderBundleEncoder}
 */
export interface IGPURenderBundleEncoderDescriptor extends GPURenderBundleEncoderDescriptor
{

}
