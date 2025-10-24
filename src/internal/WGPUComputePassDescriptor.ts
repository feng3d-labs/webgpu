import { effect, reactive } from '@feng3d/reactivity';
import { WGPUTimestampQuery } from '../caches/WGPUTimestampQuery';
import { ComputePass } from '../data/ComputePass';
import { WebGPU } from '../WebGPU';
import { GDeviceContext } from './GDeviceContext';

export class WGPUComputePassDescriptor
{
    readonly descriptor: GPUComputePassDescriptor;

    constructor(webgpu: WebGPU, computePass: ComputePass)
    {
        const r_this = reactive(this);
        const r_computePass = reactive(computePass);

        effect(() =>
        {
            const descriptor: GPUComputePassDescriptor = {};

            if (r_computePass.descriptor?.timestampQuery)
            {
                const wGPUTimestampQuery = WGPUTimestampQuery.getInstance(webgpu.device, computePass.descriptor.timestampQuery);
                reactive(wGPUTimestampQuery).gpuPassTimestampWrites;
                const timestampWrites = wGPUTimestampQuery.gpuPassTimestampWrites;

                descriptor.timestampWrites = timestampWrites;
            }

            r_this.descriptor = descriptor;
        });
    }

    run(context: GDeviceContext)
    {
        context.passEncoder = context.gpuCommandEncoder.beginComputePass(this.descriptor);
    }

    end(context: GDeviceContext)
    {
        context.passEncoder.end();
        context.passEncoder = null;
        // 处理时间戳查询
        this.descriptor.timestampWrites?.resolve(context.gpuCommandEncoder);
    }
}
