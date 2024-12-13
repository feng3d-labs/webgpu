import { IColorTargetState, IFragmentState } from "@feng3d/render-api";

/**
 * 内部对象。
 */
export interface NGPUFragmentState extends IFragmentState
{
    readonly entryPoint: string;
    readonly targets: readonly IColorTargetState[];
    readonly constants: Readonly<Record<
        string,
        GPUPipelineConstantValue
    >>;
}