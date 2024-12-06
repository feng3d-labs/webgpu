
export interface IGPUBlendComponent
{
    /**
     * Defines the {@link GPUBlendOperation} used to calculate the values written to the target
     * attachment components.
     */
    readonly operation?: GPUBlendOperation;
    /**
     * Defines the {@link GPUBlendFactor} operation to be performed on values from the fragment shader.
     */
    readonly srcFactor?: GPUBlendFactor;
    /**
     * Defines the {@link GPUBlendFactor} operation to be performed on values from the target attachment.
     */
    readonly dstFactor?: GPUBlendFactor;
}