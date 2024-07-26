import { IGPUCommandEncoder, IGPUPassEncoder } from "./IGPUCommandEncoder";
import { IGPUComputePassEncoder } from "./IGPUComputePassEncoder";
import { IGPUCopyBufferToBuffer } from "./IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "./IGPUCopyTextureToTexture";
import { IGPURenderPassEncoder } from "./IGPURenderPassEncoder";

/**
 * 命令编码器。
 *
 * @see GPUCommandEncoder
 * @see GPUDevice.createCommandEncoder
 */
export interface ICommandEncoder extends Omit<IGPUCommandEncoder, "passEncoders">
{
    /**
     * 通道编码器列表。
     *
     * 包括计算通道编码器、渲染通道编码器 以及 GPU中缓存与纹理之间拷贝。
     */
    passEncoders: IGPUPassEncoder[];
}

