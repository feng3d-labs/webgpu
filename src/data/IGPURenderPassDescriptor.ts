import { IAttachmentSize } from "./IAttachmentSize";
import { IGPURenderPassColorAttachment } from "./IGPURenderPassColorAttachment";
import { IGPURenderPassDepthStencilAttachment } from "./IGPURenderPassDepthStencilAttachment";

/**
 * 渲染通道描述。
 *
 * {@link GPURenderPassDescriptor}
 */
export interface IGPURenderPassDescriptor extends Omit<GPURenderPassDescriptor, "colorAttachments" | "depthStencilAttachment">
{
    /**
     * The set of {@link GPURenderPassColorAttachment} values in this sequence defines which
     * color attachments will be output to when executing this render pass.
     * Due to compatible usage list|usage compatibility, no color attachment
     * may alias another attachment or any resource used inside the render pass.
     */
    colorAttachments: IGPURenderPassColorAttachment[];

    /**
     * The {@link GPURenderPassDepthStencilAttachment} value that defines the depth/stencil
     * attachment that will be output to and tested against when executing this render pass.
     * Due to compatible usage list|usage compatibility, no writable depth/stencil attachment
     * may alias another attachment or any resource used inside the render pass.
     *
     * 当使用深度附件时，必须设置，使用默认值可设置为 `{}` 。
     */
    depthStencilAttachment?: IGPURenderPassDepthStencilAttachment;

    /**
     * 是否开启多重采样。WebGPU貌似只支持4重采样。如果在颜色附件中没有给出支持多重采样的纹理时则引擎将会自动为其添加。
     */
    multisample?: 4;

    /**
     * 附件尺寸。
     *
     * 默认从第一个有效附件纹理中获取尺寸。
     *
     * 该值被修改后将会改变所有附件的尺寸，并释放附件上过时的GPU纹理资源。
     */
    attachmentSize?: IAttachmentSize;
}
