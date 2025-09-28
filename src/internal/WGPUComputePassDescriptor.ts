import { effect, reactive } from '@feng3d/reactivity';
import { WGPUTimestampQuery } from '../caches/WGPUTimestampQuery';
import { ComputePass } from '../data/ComputePass';
import { WebGPU } from '../WebGPU';
import { GDeviceContext } from './GDeviceContext';

export class WGPUComputePassDescriptor
{
    descriptor: GPUComputePassDescriptor;

    constructor(webgpu: WebGPU, computePass: ComputePass)
    {
        const r_computePass = reactive(computePass);

        effect(() =>
        {
            r_computePass.descriptor?.timestampQuery;

            const timestampQuery = computePass.descriptor?.timestampQuery;

            const wGPUTimestampQuery = WGPUTimestampQuery.getInstance(webgpu.device, timestampQuery);
            if (wGPUTimestampQuery)
            {
                reactive(wGPUTimestampQuery).gpuPassTimestampWrites;
                const timestampWrites = wGPUTimestampQuery.gpuPassTimestampWrites;

                this.descriptor.timestampWrites = timestampWrites;
            }
            else
            {
                delete this.descriptor.timestampWrites;
            }
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
