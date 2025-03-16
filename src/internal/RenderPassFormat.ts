export interface RenderPassFormat
{
    readonly attachmentSize: { readonly width: number, readonly height: number }
    readonly colorFormats: readonly GPUTextureFormat[],
    readonly depthStencilFormat: GPUTextureFormat,
    readonly sampleCount?: 4
    /**
     * 初始化后被自动赋值，用于识别通道格式是否相同。
     */
    readonly _key?: string;
}