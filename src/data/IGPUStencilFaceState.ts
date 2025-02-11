/**
 * {@link GPUStencilFaceState}
 *
 * @see https://www.orillusion.com/zh/webgpu.html#dictdef-gpustencilfacestate
 */
export interface IGPUStencilFaceState
{
    /**
     * 在测试片元与 depthStencilAttachment 模板值时使用的 GPUCompareFunction。
     *
     * 默认为 "always"。
     */
    readonly compare?: GPUCompareFunction;

    /**
     * 如果片元模板比较测试（由 compare 描述）失败，则执行的 GPUStencilOperation。
     *
     * 默认为 "keep"。
     */
    readonly failOp?: GPUStencilOperation;

    /**
     * 如果由 depthCompare 描述的片元深度比较失败，则执行的 GPUStencilOperation。
     *
     * 默认为 "keep"。
     */
    readonly depthFailOp?: GPUStencilOperation;

    /**
     * 如果片元模板比较测试通过，则执行由compare描述的GPUStencilOperation。
     *
     * 默认为 "keep"。
     */
    readonly passOp?: GPUStencilOperation;
}