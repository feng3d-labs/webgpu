import { IGPUBindingResource } from "./IGPUBindGroupDescriptor";

/**
 * GPU绑定的资源映射。
 */
export interface IGPUBindingResources
{
    [name: string]: IGPUBindingResource
}

