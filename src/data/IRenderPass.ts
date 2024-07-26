import { IGPURenderPassColorAttachment, IGPURenderPassDepthStencilAttachment, IGPURenderPassDescriptor } from "../webgpu-data-driven/data/IGPURenderPassEncoder";
import { IGPUTextureView } from "../webgpu-data-driven/data/IGPUTextureView";
import { ITextureView } from "./ITextureView";

/**
 * 渲染通道描述。
 *
 * @see IGPURenderPassDescriptor
 */
export interface IRenderPass extends Omit<IGPURenderPassDescriptor, "colorAttachments" | "depthStencilAttachment">
{
    /**
     * The set of {@link GPURenderPassColorAttachment} values in this sequence defines which
     * color attachments will be output to when executing this render pass.
     * Due to compatible usage list|usage compatibility, no color attachment
     * may alias another attachment or any resource used inside the render pass.
     */
    colorAttachments: IRenderPassColorAttachment[];

    /**
     * The {@link GPURenderPassDepthStencilAttachment} value that defines the depth/stencil
     * attachment that will be output to and tested against when executing this render pass.
     * Due to compatible usage list|usage compatibility, no writable depth/stencil attachment
     * may alias another attachment or any resource used inside the render pass.
     *
     * 当使用深度附件时，必须设置，使用默认值可设置为 `{}` 。
     */
    depthStencilAttachment?: IRenderPassDepthStencilAttachment;

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

/**
 * 附件尺寸。
 */
export interface IAttachmentSize
{
    width: number, height: number
}

export interface IRenderPassDepthStencilAttachment extends Omit<IGPURenderPassDepthStencilAttachment, "view" | "resolveTarget">
{
    /**
     * A {@link GPUTextureView} describing the texture subresource that will be output to
     * and read from for this depth/stencil attachment.
     *
     * 当值为空时，将自动从颜色附件中获取尺寸来创建深度纹理。
     */
    view?: ITextureView;

    /**
     * 作为解决多重采样的纹理视图。
     */
    resolveTarget?: ITextureView;
}

/**
 * {@link IGPURenderPassColorAttachment}
 */
export interface IRenderPassColorAttachment extends Omit<IGPURenderPassColorAttachment, "view" | "resolveTarget" | "loadOp" | "storeOp">
{
    /**
     * A {@link GPUTextureView} describing the texture subresource that will be output to for this
     * color attachment.
     */
    view: ITextureView;

    /**
     * A {@link GPUTextureView} describing the texture subresource that will receive the resolved
     * output for this color attachment if {@link GPURenderPassColorAttachment#view} is
     * multisampled.
     */
    resolveTarget?: IGPUTextureView;

    /**
     * Indicates the value to clear {@link GPURenderPassColorAttachment#view} to prior to executing the
     * render pass. If not map/exist|provided, defaults to `{r: 0, g: 0, b: 0, a: 0}`. Ignored
     * if {@link GPURenderPassColorAttachment#loadOp} is not {@link GPULoadOp#"clear"}.
     * The components of {@link GPURenderPassColorAttachment#clearValue} are all double values.
     * They are converted [$to a texel value of texture format$] matching the render attachment.
     * If conversion fails, a validation error is generated.
     *
     * 默认 `[0, 0, 0, 0]` 。
     */
    clearValue?: GPUColor;

    /**
     * Indicates the load operation to perform on {@link GPURenderPassColorAttachment#view} prior to
     * executing the render pass.
     * Note: It is recommended to prefer clearing; see {@link GPULoadOp#"clear"} for details.
     *
     * 默认 `"clear"` 。
    */
    loadOp?: GPULoadOp;

    /**
     * The store operation to perform on {@link GPURenderPassColorAttachment#view}
     * after executing the render pass.
     *
      * 默认 `"store"` 。
      */
    storeOp?: GPUStoreOp;
}
