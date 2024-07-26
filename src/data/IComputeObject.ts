import { IBindingResources } from "./IBindingResources";
import { IGPUComputeObject, IGPUComputePipeline, IGPUProgrammableStage } from "./IGPUComputeObject";

export interface IComputeObject extends Omit<IGPUComputeObject, "pipeline" | "bindGroups">
{
    /**
     * 计算管线。
     */
    pipeline: IComputePipeline;

    /**
     * 绑定资源。包含数值、纹理、采样、外部纹理。
     */
    bindingResources?: IBindingResources;
}

export interface IComputePipeline extends Omit<IGPUComputePipeline, "compute">
{
    /**
     * 计算程序。
     */
    compute: IGPUProgrammableStage;
}
