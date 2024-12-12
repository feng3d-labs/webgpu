import { ICommandEncoder, ISubmit } from "@feng3d/render-api";

declare module "@feng3d/render-api"
{
    /**
     * 一次 GPU 提交。
     *
     * {@link GPUQueue.submit}
     */
    export interface ISubmit
    {
        /**
         * 命令编码器列表。
         */
        commandEncoders: ICommandEncoder[];
    }
}
