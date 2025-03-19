export interface RenderPassFormat
{
    readonly attachmentSize: { readonly width: number, readonly height: number }
    readonly colorFormats: readonly GPUTextureFormat[],
    readonly depthStencilFormat: GPUTextureFormat,
    readonly sampleCount?: 4
}