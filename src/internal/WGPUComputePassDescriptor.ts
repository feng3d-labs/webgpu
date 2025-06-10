import { effect, reactive } from '@feng3d/reactivity';
import { WGPUTimestampQuery } from '../caches/GPUPassTimestampWritesManager';
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

            if (timestampQuery)
            {
                this.descriptor.timestampWrites = WGPUTimestampQuery.getGPUPassTimestampWrites(webgpu.device, timestampQuery);
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
