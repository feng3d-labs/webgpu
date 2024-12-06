import { IGPUColorTargetState } from "../data/IGPUColorTargetState";
import { IGPUFragmentState } from "../data/IGPUFragmentState";

/**
 * 内部对象。
 */
export interface NGPUFragmentState extends IGPUFragmentState
{
    readonly entryPoint: string;
    readonly targets: readonly IGPUColorTargetState[];
    readonly constants: Readonly<Record<
        string,
        GPUPipelineConstantValue
    >>;
}