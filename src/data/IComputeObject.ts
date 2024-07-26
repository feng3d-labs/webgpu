import { IBindingResources } from "./IBindingResources";
import { IGPUComputeObject, IGPUComputePipeline } from "./IGPUComputeObject";

export interface IComputeObject extends Omit<IGPUComputeObject, "pipeline" | "bindGroups">
{
    /**
     * 计算管线。
     */
    pipeline: IGPUComputePipeline;

    /**
     * 绑定资源。包含数值、纹理、采样、外部纹理。
     */
    bindingResources?: IBindingResources;
}
