/**
 * 由纹理格式获取纹理可支持的用途。
 * 
 * 包含深度、多重采样、以及个别的无法作为存储纹理。
 * 
 * @param format 
 * @param sampleCount 
 * @returns 
 */
export function getTextureUsageFromFormat(format: GPUTextureFormat, sampleCount?: 4): GPUTextureUsageFlags
{
    let usage: GPUTextureUsageFlags;
    // 包含深度以及多重采样的纹理不支持 STORAGE_BINDING
    if (format.indexOf("depth") !== -1 // 包含深度的纹理 
        || sampleCount // 多重采样纹理
        || format === "r8unorm"
        || format === "bgra8unorm" // chrome@123 不支持，但chrome@130支持
    )
    {
        usage = (0
            | GPUTextureUsage.COPY_SRC
            | GPUTextureUsage.COPY_DST
            | GPUTextureUsage.TEXTURE_BINDING
            | GPUTextureUsage.RENDER_ATTACHMENT);
    }
    else
    {
        usage = (0
            | GPUTextureUsage.COPY_SRC
            | GPUTextureUsage.COPY_DST
            | GPUTextureUsage.TEXTURE_BINDING
            | GPUTextureUsage.STORAGE_BINDING
            | GPUTextureUsage.RENDER_ATTACHMENT);
    }

    return usage;
}