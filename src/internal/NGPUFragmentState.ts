import { IFragmentState } from "@feng3d/render-api";
import { IGPUColorTargetState } from "../data/IGPUColorTargetState";

/**
 * 内部对象。
 */
export interface NGPUFragmentState extends IFragmentState
{
    readonly entryPoint: string;
    readonly targets: readonly IGPUColorTargetState[];
    readonly constants: Readonly<Record<
        string,
        GPUPipelineConstantValue
    >>;
}