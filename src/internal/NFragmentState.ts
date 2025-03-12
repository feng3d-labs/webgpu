/**
 * 内部对象。
 */
export interface NFragmentState
{
    readonly code: string;
    readonly entryPoint: string;
    readonly targets: readonly GPUColorTargetState[];
    readonly constants: Readonly<Record<
        string,
        GPUPipelineConstantValue
    >>;

    _version?: number;
}