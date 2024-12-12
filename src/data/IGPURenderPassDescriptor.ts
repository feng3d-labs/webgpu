import { IRenderPassColorAttachment, IRenderPassDescriptor } from "@feng3d/render-api";
import { IGPURenderPassDepthStencilAttachment } from "./IGPURenderPassDepthStencilAttachment";

/**
 * 渲染通道描述。
 *
 * {@link GPURenderPassDescriptor}
 */
export interface IGPURenderPassDescriptor extends IRenderPassDescriptor
{
    /**
     * The initial value of {@link GPUObjectBase#label|GPUObjectBase.label}.
     */
    label?: string;

    /**
     * The set of {@link GPURenderPassColorAttachment} values in this sequence defines which
     * color attachments will be output to when executing this render pass.
     * Due to compatible usage list|usage compatibility, no color attachment
     * may alias another attachment or any resource used inside the render pass.
     */
    readonly colorAttachments: readonly IRenderPassColorAttachment[];

    /**
     * The {@link GPURenderPassDepthStencilAttachment} value that defines the depth/stencil
     * attachment that will be output to and tested against when executing this render pass.
     * Due to compatible usage list|usage compatibility, no writable depth/stencil attachment
     * may alias another attachment or any resource used inside the render pass.
     *
     * 当使用深度附件时，必须设置，使用默认值可设置为 `{}` 。
     */
    readonly depthStencilAttachment?: IGPURenderPassDepthStencilAttachment;

    /**
     * 附件尺寸。
     *
     * 默认从第一个有效附件纹理中获取尺寸。
     *
     * 该值被修改后将会改变所有附件的尺寸，并释放附件上过时的GPU纹理资源。
     */
    attachmentSize?: { width: number, height: number };

    /**
     * The maximum number of draw calls that will be done in the render pass. Used by some
     * implementations to size work injected before the render pass. Keeping the default value
     * is a good default, unless it is known that more draw calls will be done.
     */
    maxDrawCount?: GPUSize64;
}
