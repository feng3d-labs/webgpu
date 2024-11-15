export interface IGPURenderPassFormat
{
    attachmentSize: { width: number, height: number }
    colorFormats: GPUTextureFormat[],
    depthStencilFormat: GPUTextureFormat,
    multisample?: 4
}