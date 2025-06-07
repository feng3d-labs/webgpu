import { GPUComputePassDescriptorManager } from '../caches/GPUComputePassDescriptorManager';
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
        this.descriptor = GPUComputePassDescriptorManager.getGPUComputePassDescriptor(webgpu.device, computePass);
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
