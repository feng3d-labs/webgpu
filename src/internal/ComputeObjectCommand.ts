import { reactive } from '@feng3d/reactivity';
import { WGPUBindGroup } from '../caches/WGPUBindGroup';
import { WGPUComputePipeline } from '../caches/WGPUComputePipeline';
import { WGPUPipelineLayout } from '../caches/WGPUPipelineLayout';
import { ComputeObject } from '../data/ComputeObject';
import { WebGPU } from '../WebGPU';
import { GDeviceContext } from './GDeviceContext';
import { ReactiveObject } from '../ReactiveObject';

export class ComputeObjectCommand extends ReactiveObject
{
    static getInstance(device: GPUDevice, computeObject: ComputeObject)
    {
        return new ComputeObjectCommand(device, computeObject);
    }

    constructor(public readonly device: GPUDevice, public readonly computeObject: ComputeObject)
    {
        super();

        const r_computeObject = reactive(computeObject);

        this.effect(() =>
        {
            r_computeObject.pipeline;
            const wGPUComputePipeline = WGPUComputePipeline.getInstance(device, computeObject.pipeline);
            reactive(wGPUComputePipeline).gpuComputePipeline;
            this.computePipeline = wGPUComputePipeline.gpuComputePipeline;

            // 计算 bindGroups
            this.setBindGroup = [];
            const layout = WGPUPipelineLayout.getPipelineLayout({ compute: r_computeObject.pipeline.compute.code });

            r_computeObject.bindingResources;
            layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
            {
                const wgpuBindGroup = WGPUBindGroup.getInstance(device, bindGroupLayout, computeObject.bindingResources);
                reactive(wgpuBindGroup).gpuBindGroup;

                const gpuBindGroup = wgpuBindGroup.gpuBindGroup;

                this.setBindGroup.push([group, gpuBindGroup]);
            });

            this.dispatchWorkgroups = [r_computeObject.workgroups.workgroupCountX, r_computeObject.workgroups.workgroupCountY, r_computeObject.workgroups.workgroupCountZ];
        });

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
