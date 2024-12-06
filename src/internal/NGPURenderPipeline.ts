import { IGPURenderPipeline } from "../data/IGPURenderPipeline";
import { NGPUFragmentState } from "./NGPUFragmentState";
import { NGPUVertexState } from "./NGPUVertexState";

/**
 * 内部对象。
 */
export interface NGPURenderPipeline extends IGPURenderPipeline
{
    vertex: NGPUVertexState
    fragment: NGPUFragmentState,
    depthStencil: GPUDepthStencilState,
    multisample: GPUMultisampleState,
}