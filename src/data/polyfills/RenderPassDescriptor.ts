import { RenderPassColorAttachment, RenderPassDescriptor } from "@feng3d/render-api";

declare module "@feng3d/render-api"
{
    /**
     * 渲染通道描述。
     *
     * {@link GPURenderPassDescriptor}
     */
    export interface RenderPassDescriptor
    {
        /**
         * 附件尺寸。
         *
         * 默认从第一个有效附件纹理中获取尺寸。
         *
         * 该值被修改后将会改变所有附件的尺寸，并释放附件上过时的GPU纹理资源。
         */
        readonly attachmentSize?: { readonly width: number, readonly height: number };

        /**
         * The maximum number of draw calls that will be done in the render pass. Used by some
         * implementations to size work injected before the render pass. Keeping the default value
         * is a good default, unless it is known that more draw calls will be done.
         */
        readonly maxDrawCount?: GPUSize64;
    }

}
