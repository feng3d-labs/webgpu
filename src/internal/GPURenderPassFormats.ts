export type GPURenderPassFormat = {
    colorFormats: GPUTextureFormat[],
    depthStencilFormat: GPUTextureFormat,
    multisample?: 4
}