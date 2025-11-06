import { WGPUTimestampQuery } from '../caches/WGPUTimestampQuery';
import { ComputePass } from '../data/ComputePass';
import { WGPUComputeObject } from './WGPUComputeObject';

export function runComputePass(device: GPUDevice, commandEncoder: GPUCommandEncoder, computePass: ComputePass)
{
    const descriptor: GPUComputePassDescriptor = {};
    if (computePass.descriptor?.timestampQuery)
    {
        const wGPUTimestampQuery = WGPUTimestampQuery.getInstance(device, computePass.descriptor.timestampQuery);
        descriptor.timestampWrites = wGPUTimestampQuery.gpuPassTimestampWrites;
    }
    //
    const passEncoder = commandEncoder.beginComputePass(descriptor);

    computePass.computeObjects.forEach((computeObject) =>
    {
        const wGPUComputeObject = WGPUComputeObject.getInstance(device, computeObject);
        wGPUComputeObject.run(device, passEncoder);
    })

    passEncoder.end();

    // 处理时间戳查询
    descriptor.timestampWrites?.resolve(commandEncoder);
}