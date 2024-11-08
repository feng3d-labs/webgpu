export interface IGPURenderPassFormat
{
    colorFormats: GPUTextureFormat[],
    depthStencilFormat: GPUTextureFormat,
    multisample?: 4
}