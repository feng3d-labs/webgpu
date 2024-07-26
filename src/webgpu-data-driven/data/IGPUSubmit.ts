import { IGPUCommandEncoder } from "./IGPUCommandEncoder";

/**
 * 一次 GPU 提交。
 *
 * {@link GPUQueue.submit}
 */
export interface IGPUSubmit
{
    /**
     * 命令编码器列表。
     */
    commandEncoders: IGPUCommandEncoder[];
}
