import { RenderPassDepthStencilAttachment, TextureView } from "@feng3d/render-api";

declare module "@feng3d/render-api"
{
    /**
     * GPU渲染通道深度模板附件。
     *
     * @see GPURenderPassDepthStencilAttachment
     */
    export interface RenderPassDepthStencilAttachment
    {
        /**
         * A {@link GPUTextureView} describing the texture subresource that will be output to
         * and read from for this depth/stencil attachment.
         *
         * 当值为空时，将自动从颜色附件中获取尺寸来创建深度纹理。
         */
        readonly view?: TextureView;

        /**
         * The store operation to perform on {@link GPURenderPassDepthStencilAttachment#view}'s
         * depth component after executing the render pass.
         */
        readonly depthStoreOp?: GPUStoreOp;

        /**
         * Indicates that the depth component of {@link GPURenderPassDepthStencilAttachment#view}
         * is read only.
         */
        readonly depthReadOnly?: boolean;

        /**
         * The store operation to perform on {@link GPURenderPassDepthStencilAttachment#view}'s
         * stencil component after executing the render pass.
         */
        readonly stencilStoreOp?: GPUStoreOp;

        /**
         * Indicates that the stencil component of {@link GPURenderPassDepthStencilAttachment#view}
         * is read only.
         */
        readonly stencilReadOnly?: boolean;
    }

}
