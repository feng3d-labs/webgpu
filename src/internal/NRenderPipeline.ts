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
}