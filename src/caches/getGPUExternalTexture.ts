import { IGPUExternalTexture } from "../data/IGPUBindGroup";

/**
 * 获取 WebGPU外部纹理
 *
 * @param device
 * @param resource
 * @returns
 */
export function getGPUExternalTexture(device: GPUDevice, resource: IGPUExternalTexture)
{
    const gExternalTexture = device.importExternalTexture({
        source: resource.source,
    });

    return gExternalTexture;
}
