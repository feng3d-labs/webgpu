import { ICommandEncoder } from "./ICommandEncoder";
import { IGPUSubmit } from "./IGPUSubmit";

/**
 * 一次 GPU 提交。
 *
 * @see GPUQueue.submit
 */
export interface ISubmit extends Omit<IGPUSubmit, "commandEncoders">
{
    /**
     * 命令编码器列表。
     */
    commandEncoders: ICommandEncoder[];
}
