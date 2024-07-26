import { IGPURenderBundleEncoderDescriptor, IGPURenderBundleObject } from "./IGPURenderBundleObject";
import { IGPURenderObject } from "./IGPURenderObject";

export interface IRenderBundleObject extends Omit<IGPURenderBundleObject, "renderObjects" | "renderBundle">
{
    /**
     * GPU渲染捆绑编码器描述。
     */
    renderBundle?: IRenderBundleEncoderDescriptor;

    /**
     * 渲染对象。
     */
    renderObjects: IGPURenderObject[];
}

/**
 * 'colorFormats' | 'depthStencilFormat' | 'sampleCount' 都将从GPU渲染通道中自动获取。
 */
export interface IRenderBundleEncoderDescriptor extends Omit<IGPURenderBundleEncoderDescriptor, "colorFormats" | "depthStencilFormat" | "sampleCount">
{
}
