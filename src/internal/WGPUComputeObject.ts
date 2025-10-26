import { reactive } from '@feng3d/reactivity';
import { WGPUBindGroup } from '../caches/WGPUBindGroup';
import { WGPUComputePipeline } from '../caches/WGPUComputePipeline';
import { WGPUPipelineLayout } from '../caches/WGPUPipelineLayout';
import { ComputeObject } from '../data/ComputeObject';
import { ReactiveObject } from '../ReactiveObject';
import { GDeviceContext } from './GDeviceContext';

export class WGPUComputeObject extends ReactiveObject
{
    run: (context: GDeviceContext) => void;

    constructor(device: GPUDevice, computeObject: ComputeObject)
    {
        super();

        this._onCreate(device, computeObject);
        this._onMap(device, computeObject);
    }

    private _onCreate(device: GPUDevice, computeObject: ComputeObject)
    {
        const r_computeObject = reactive(computeObject);

        let computePipeline: GPUComputePipeline;
        let setBindGroup: [index: GPUIndex32, bindGroup: GPUBindGroup][];
        let dispatchWorkgroups: [workgroupCountX: GPUSize32, workgroupCountY?: GPUSize32, workgroupCountZ?: GPUSize32];

        this.effect(() =>
        {
            r_computeObject.pipeline;
            const wGPUComputePipeline = WGPUComputePipeline.getInstance(device, computeObject.pipeline);
            reactive(wGPUComputePipeline).gpuComputePipeline;
            computePipeline = wGPUComputePipeline.gpuComputePipeline;

            // 计算 bindGroups
            setBindGroup = [];
            const layout = WGPUPipelineLayout.getPipelineLayout({ compute: r_computeObject.pipeline.compute.code });

            r_computeObject.bindingResources;
            layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
            {
                const wgpuBindGroup = WGPUBindGroup.getInstance(device, bindGroupLayout, computeObject.bindingResources);
                reactive(wgpuBindGroup).gpuBindGroup;

                const gpuBindGroup = wgpuBindGroup.gpuBindGroup;

                setBindGroup.push([group, gpuBindGroup]);
            });

            dispatchWorkgroups = [r_computeObject.workgroups.workgroupCountX, r_computeObject.workgroups.workgroupCountY, r_computeObject.workgroups.workgroupCountZ];
        });

        this.run = (context: GDeviceContext) =>
        {
            const passEncoder = context.passEncoder;

            passEncoder.setPipeline(computePipeline);
            setBindGroup.forEach(([index, bindGroup]) =>
            {
                passEncoder.setBindGroup(index, bindGroup);
            });
            const [workgroupCountX, workgroupCountY, workgroupCountZ] = dispatchWorkgroups;

            passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
        }
    }

    private _onMap(device: GPUDevice, computeObject: ComputeObject)
    {
        device.computeObjectCommands ??= new WeakMap<ComputeObject, WGPUComputeObject>();
        device.computeObjectCommands.set(computeObject, this);
        this.destroyCall(() => { device.computeObjectCommands.delete(computeObject); });
    }

    static getInstance(device: GPUDevice, computeObject: ComputeObject)
    {
        return device.computeObjectCommands?.get(computeObject) || new WGPUComputeObject(device, computeObject);
    }
}

declare global
{
    interface GPUDevice
    {
        computeObjectCommands: WeakMap<ComputeObject, WGPUComputeObject>;
    }
}