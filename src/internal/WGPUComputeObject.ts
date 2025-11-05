import { computed, reactive } from '@feng3d/reactivity';
import { ChainMap } from '@feng3d/render-api';
import { WGPUBindGroup } from '../caches/WGPUBindGroup';
import { WGPUComputePipeline } from '../caches/WGPUComputePipeline';
import { WGPUPipelineLayout } from '../caches/WGPUPipelineLayout';
import { ComputeObject } from '../data/ComputeObject';
import { ReactiveObject } from '../ReactiveObject';

export class WGPUComputeObject extends ReactiveObject
{
    run: (device: GPUDevice, commandEncoder: GPUComputePassEncoder) => void;

    constructor(device: GPUDevice, computeObject: ComputeObject)
    {
        super();

        this._onCreate(device, computeObject);
        //
        WGPUComputeObject.map.set([device, computeObject], this);
        this.destroyCall(() => { WGPUComputeObject.map.delete([device, computeObject]); });
    }

    private _onCreate(device: GPUDevice, computeObject: ComputeObject)
    {
        const r_computeObject = reactive(computeObject);

        const computedComputePipeline = computed(() =>
        {
            r_computeObject.pipeline;
            const wGPUComputePipeline = WGPUComputePipeline.getInstance(device, computeObject.pipeline);
            const computePipeline = wGPUComputePipeline.gpuComputePipeline;

            return computePipeline;
        })
        const computedSetBindGroup = computed(() =>
        {
            // 计算 bindGroups
            const setBindGroup: [index: GPUIndex32, bindGroup: GPUBindGroup][] = [];
            const layout = WGPUPipelineLayout.getPipelineLayout({ compute: r_computeObject.pipeline.compute.code });

            r_computeObject.bindingResources;
            layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
            {
                const wgpuBindGroup = WGPUBindGroup.getInstance(device, bindGroupLayout, computeObject.bindingResources);

                setBindGroup.push([group, wgpuBindGroup.gpuBindGroup]);
            });

            return setBindGroup;
        });

        const computedDispatchWorkgroups = computed(() =>
        {
            const dispatchWorkgroups: [workgroupCountX: GPUSize32, workgroupCountY?: GPUSize32, workgroupCountZ?: GPUSize32] = [r_computeObject.workgroups.workgroupCountX];

            if (r_computeObject.workgroups.workgroupCountY)
            {
                dispatchWorkgroups[1] = r_computeObject.workgroups.workgroupCountY;
            }
            if (r_computeObject.workgroups.workgroupCountZ)
            {
                dispatchWorkgroups[2] = r_computeObject.workgroups.workgroupCountZ;
            }

            return dispatchWorkgroups;
        });

        this.run = (device: GPUDevice, commandEncoder: GPUComputePassEncoder) =>
        {
            const computePipeline = computedComputePipeline.value;
            commandEncoder.setPipeline(computePipeline);

            const setBindGroup = computedSetBindGroup.value;
            setBindGroup.forEach(([index, bindGroup]) =>
            {
                commandEncoder.setBindGroup(index, bindGroup);
            });

            const dispatchWorkgroups = computedDispatchWorkgroups.value;
            commandEncoder.dispatchWorkgroups(...dispatchWorkgroups);
        }
    }

    static getInstance(device: GPUDevice, computeObject: ComputeObject)
    {
        return this.map.get([device, computeObject]) || new WGPUComputeObject(device, computeObject);
    }
    static readonly map = new ChainMap<[GPUDevice, ComputeObject], WGPUComputeObject>();
}
