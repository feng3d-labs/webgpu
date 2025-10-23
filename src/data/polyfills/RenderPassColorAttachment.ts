import { reactive } from '@feng3d/reactivity';
import { defaultRenderPassColorAttachment } from '@feng3d/render-api';

declare module '@feng3d/render-api'
{

    /**
     * GPU渲染通道颜色附件。
     *
     * {@link GPURenderPassColorAttachment}
     */
    export interface RenderPassColorAttachment
    {
        /**
         * A {@link GPUTextureView} describing the texture subresource that will be output to for this
         * color attachment.
         */
        readonly view?: TextureView;

        /**
         * The store operation to perform on {@link GPURenderPassColorAttachment#view}
         * after executing the render pass.
         *
          * 默认 `"store"` 。
          */
        readonly storeOp?: GPUStoreOp;

        /**
         * Indicates the depth slice index of {@link GPUTextureViewDimension#"3d"} {@link GPURenderPassColorAttachment#view}
         * that will be output to for this color attachment.
         */
        readonly depthSlice?: GPUIntegerCoordinate;
    }
}
const r_defaultRenderPassColorAttachment = reactive(defaultRenderPassColorAttachment);

r_defaultRenderPassColorAttachment.storeOp = 'store';
r_defaultRenderPassColorAttachment.depthSlice = undefined;
