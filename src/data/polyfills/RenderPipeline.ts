import { BlendState } from '../BlendState';
import { DepthStencilState } from '../DepthStencilState';

import { MultisampleState } from '../MultisampleState';

declare module '../RenderPipeline'
{
    /**
     * 扩展仅WebGPU支持的混合参数。 "src1" | "one-minus-src1" | "src1-alpha" | "one-minus-src1-alpha" 需要开启扩展 `dual-source-blending` 。
     */
    export interface IBlendFactorMap
    {
        'src1': 'src1';
        'one-minus-src1': 'one-minus-src1';
        'src1-alpha': 'src1-alpha';
        'one-minus-src1-alpha': 'one-minus-src1-alpha';
    }
}

declare module '../BlendState'
{
    /**
     * 扩展仅WebGPU支持的混合参数。 "src1" | "one-minus-src1" | "src1-alpha" | "one-minus-src1-alpha" 需要开启扩展 `dual-source-blending` 。
     */
    export interface IBlendFactorMap
    {
        'src1': 'src1';
        'one-minus-src1': 'one-minus-src1';
        'src1-alpha': 'src1-alpha';
        'one-minus-src1-alpha': 'one-minus-src1-alpha';
    }
}

declare module '../DepthStencilState'
{
    /**
     * 深度模板阶段描述。
     *
     * `format` 将从深度附件 {@link IGPURenderPassDescriptor.depthStencilAttachment} 纹理上获取。
     *
     * {@link GPUDepthStencilState}
     *
     * @see https://www.orillusion.com/zh/webgpu.html#depth-stencil-state
     */
    export interface DepthStencilState
    {
        /**
         * 片元的最大深度偏差。
         *
         * 默认为 0 。
         */
        readonly depthBiasClamp?: number;
    }
}
