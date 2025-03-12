import { Color } from "@feng3d/render-api";
import { NFragmentState } from "./NFragmentState";
import { NGPUVertexState } from "./NGPUVertexState";

/**
 * 内部对象。
 */
export interface NRenderPipeline
{
    readonly label: string;
    readonly primitive: GPUPrimitiveState;
    readonly vertex: NGPUVertexState
    readonly fragment: NFragmentState,
    readonly depthStencil: GPUDepthStencilState,
    readonly multisample: GPUMultisampleState,

    /**
     * 如果任意模板测试结果使用了 "replace" 运算，则需要再渲染前设置 `stencilReference` 值。
     */
    readonly stencilReference: number;

    /**
     * 当混合系数用到了混合常量值时设置混合常量值。
     */
    readonly blendConstantColor: Color;
}