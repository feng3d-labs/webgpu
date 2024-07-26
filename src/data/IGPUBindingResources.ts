import { IGPUBindingResource } from "./IGPUBindGroup";

/**
 * GPU绑定的资源映射。
 */
export interface IGPUBindingResources
{
    [name: string]: IGPUBindingResource
}

