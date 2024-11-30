/**
 * Sets the constant blend color and alpha values used with {@link GPUBlendFactor#"constant"}
 * and {@link GPUBlendFactor#"one-minus-constant"} {@link GPUBlendFactor}s.
 *
 * 
 * {@link GPURenderPassEncoder.setBlendConstant}
 */
export interface IGPUBlendConstant
{
    /**
     * 数据类型。
     */
    readonly __type?: "IGPUBlendConstant";

    readonly color: [r: number, g: number, b: number, a: number];
}