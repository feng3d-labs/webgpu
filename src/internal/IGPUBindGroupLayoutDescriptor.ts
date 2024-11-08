/**
 * GPU绑定组布局描述。
 *
 * @see GPUBindGroupLayoutDescriptor
 * @see GPUDevice.createBindGroupLayout
 */
export interface IGPUBindGroupLayoutDescriptor extends Omit<GPUBindGroupLayoutDescriptor, "entries">
{
    entries: IGPUBindGroupLayoutEntry[];
}

/**
 * 绑定组入口布局描述。
 *
 * @see GPUBindGroupLayoutEntry
 */
export interface IGPUBindGroupLayoutEntry extends Omit<GPUBindGroupLayoutEntry, "visibility">
{
    /**
     * A bitset of the members of {@link GPUShaderStage}.
     * Each set bit indicates that a {@link GPUBindGroupLayoutEntry}'s resource
     * will be accessible from the associated shader stage.
     */
    visibility: IGPUShaderStageFlags[];
}

/**
 * GPU着色阶段。
 *
 * @see GPUShaderStage
 */
export type IGPUShaderStageFlags = "VERTEX" | "FRAGMENT" | "COMPUTE";
