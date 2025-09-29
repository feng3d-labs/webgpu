import { reactive } from '@feng3d/reactivity';
import { GPUBindGroupManager } from '../caches/GPUBindGroupManager';
import { WGPUComputePipeline } from '../caches/WGPUComputePipeline';
import { WGPUPipelineLayout } from '../caches/WGPUPipelineLayout';
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

        const wGPUComputePipeline = WGPUComputePipeline.getInstance(device, pipeline);
        reactive(wGPUComputePipeline).gpuComputePipeline;
        this.computePipeline = wGPUComputePipeline.gpuComputePipeline;

        // 计算 bindGroups
        this.setBindGroup = [];
        const layout = WGPUPipelineLayout.getPipelineLayout({ compute: pipeline.compute.code });

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
