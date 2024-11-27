export interface IGPURenderPassFormat
{
    attachmentSize: { width: number, height: number }
    colorFormats: GPUTextureFormat[],
    depthStencilFormat: GPUTextureFormat,
    multisample?: 4
    /**
     * 初始化后被自动赋值，用于识别通道格式是否相同。
     */
    _key?: string;
}