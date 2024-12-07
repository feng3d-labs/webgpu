import { ISubmit } from "@feng3d/render-api";
import { IGPUCommandEncoder } from "./IGPUCommandEncoder";

/**
 * 一次 GPU 提交。
 *
 * {@link GPUQueue.submit}
 */
export interface IGPUSubmit extends ISubmit
{
    /**
     * 命令编码器列表。
     */
    commandEncoders: IGPUCommandEncoder[];
}
