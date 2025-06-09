import { effect, reactive } from '@feng3d/reactivity';
import { GPUPassTimestampWritesManager } from '../caches/GPUPassTimestampWritesManager';
import { ComputePass } from '../data/ComputePass';
import { WebGPU } from '../WebGPU';
import { ComputeObjectCommand } from './ComputeObjectCommand';

export class ComputePassCommand
{
    static getInstance(webgpu: WebGPU, computePass: ComputePass)
    {
        return new ComputePassCommand(webgpu, computePass);
    }

    constructor(public readonly webgpu: WebGPU, public readonly computePass: ComputePass)
    {
        this.descriptor = {};

        const r_computePass = reactive(computePass);

        effect(() =>
        {
            r_computePass.descriptor?.timestampQuery;

            const timestampQuery = computePass.descriptor?.timestampQuery;

            if (timestampQuery)
            {
                this.descriptor.timestampWrites = GPUPassTimestampWritesManager.getGPUPassTimestampWrites(webgpu.device, timestampQuery);
            }
            else
            {
                delete this.descriptor.timestampWrites;
            }
        });

        this.computeObjectCommands = computePass.computeObjects.map((computeObject) => ComputeObjectCommand.getInstance(webgpu, computeObject));
    }

    run(commandEncoder: GPUCommandEncoder)
    {
        const { descriptor, computeObjectCommands } = this;
        //
        const passEncoder = commandEncoder.beginComputePass(descriptor);

        computeObjectCommands.forEach((command) => command.run(passEncoder));
        passEncoder.end();
        // 处理时间戳查询
        descriptor.timestampWrites?.resolve(commandEncoder);
    }

    descriptor: GPUComputePassDescriptor;
    computeObjectCommands: ComputeObjectCommand[];
}
