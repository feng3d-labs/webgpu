import { GPUBindGroupManager } from '../caches/GPUBindGroupManager';
import { GPUComputePipelineManager } from '../caches/GPUComputePipelineManager';
import { GPUPipelineLayoutManager } from '../caches/GPUPipelineLayoutManager';
import { ComputeObject } from '../data/ComputeObject';
import { WebGPU } from '../WebGPU';
import { GDeviceContext } from './GDeviceContext';

export class ComputeObjectCommand
{
    static getInstance(webgpu: WebGPU, computeObject: ComputeObject)
    {
        return new ComputeObjectCommand(webgpu, computeObject);
    }

    constructor(public readonly webgpu: WebGPU, public readonly computeObject: ComputeObject)
    {
        const device = this.webgpu.device;
        const { pipeline, bindingResources, workgroups } = computeObject;

        this.computePipeline = GPUComputePipelineManager.getGPUComputePipeline(device, pipeline);

        // 计算 bindGroups
        this.setBindGroup = [];
        const layout = GPUPipelineLayoutManager.getPipelineLayout({ compute: pipeline.compute.code });

        layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
        {
            const gpuBindGroup: GPUBindGroup = GPUBindGroupManager.getGPUBindGroup(device, bindGroupLayout, bindingResources);

            this.setBindGroup.push([group, gpuBindGroup]);
        });

        this.dispatchWorkgroups = [workgroups.workgroupCountX, workgroups.workgroupCountY, workgroups.workgroupCountZ];
    }

    run(context: GDeviceContext)
    {
        const passEncoder = context.passEncoder;

        passEncoder.setPipeline(this.computePipeline);
        this.setBindGroup.forEach(([index, bindGroup]) =>
        {
            passEncoder.setBindGroup(index, bindGroup);
        });
        const [workgroupCountX, workgroupCountY, workgroupCountZ] = this.dispatchWorkgroups;

        passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
    }

    computePipeline: GPUComputePipeline;
    setBindGroup: [index: GPUIndex32, bindGroup: GPUBindGroup][];
    dispatchWorkgroups: [workgroupCountX: GPUSize32, workgroupCountY?: GPUSize32, workgroupCountZ?: GPUSize32];
}
