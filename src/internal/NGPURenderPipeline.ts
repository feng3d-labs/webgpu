import { IGPURenderPipeline } from "../data/IGPURenderPipeline";
import { NGPUFragmentState } from "./NGPUFragmentState";
import { NGPUVertexState } from "./NGPUVertexState";

/**
 * 内部对象。
 */
export interface NGPURenderPipeline extends IGPURenderPipeline
{
    readonly label: string;
    readonly primitive: GPUPrimitiveState;
    readonly vertex: NGPUVertexState
    readonly fragment: NGPUFragmentState,
    readonly depthStencil: GPUDepthStencilState,
    readonly multisample: GPUMultisampleState,
}