import { ComputePass } from '../ComputePass';

declare module '../CommandEncoder'
{
    export interface PassEncoderMap
    {
        GPUComputePass: ComputePass;
    }
}
