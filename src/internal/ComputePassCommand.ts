import { ComputePass } from '../data/ComputePass';
import { WebGPU } from '../WebGPU';
import { ComputeObjectCommand } from './ComputeObjectCommand';
import { GDeviceContext } from './GDeviceContext';
import { WGPUComputePassDescriptor } from './WGPUComputePassDescriptor';

export class ComputePassCommand
{
    static getInstance(webgpu: WebGPU, computePass: ComputePass)
    {
        return new ComputePassCommand(webgpu, computePass);
    }

    constructor(public readonly webgpu: WebGPU, public readonly computePass: ComputePass)
    {
        this.descriptor = new WGPUComputePassDescriptor(webgpu, computePass);

        this.computeObjectCommands = computePass.computeObjects.map((computeObject) => ComputeObjectCommand.getInstance(webgpu, computeObject));
    }

    run(context: GDeviceContext)
    {
        const { descriptor, computeObjectCommands } = this;

        //
        descriptor.run(context);

        computeObjectCommands.forEach((command) => command.run(context));

        descriptor.end(context);
    }

    descriptor: WGPUComputePassDescriptor;
    computeObjectCommands: ComputeObjectCommand[];
}
