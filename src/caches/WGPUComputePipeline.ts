import { reactive } from '@feng3d/reactivity';
import { ComputePipeline } from '../data/ComputePipeline';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUComputeStage } from './WGPUComputeStage';
import { WGPUPipelineLayout } from './WGPUPipelineLayout';

export class WGPUComputePipeline extends ReactiveObject
{
    readonly gpuComputePipeline: GPUComputePipeline;

    constructor(device: GPUDevice, computePipeline: ComputePipeline)
    {
        super();

        this._createGPUComputePipeline(device, computePipeline);

        this._onMap(device, computePipeline);
    }

    private _createGPUComputePipeline(device: GPUDevice, computePipeline: ComputePipeline)
    {
        const r_this = reactive(this);
        const r_computePipeline = reactive(computePipeline);

        this.effect(() =>
        {
            r_computePipeline.label;
            r_computePipeline.compute;

            const computeStage = computePipeline.compute;

            // 从GPU管线中获取管线布局。
            const wGPUPipelineLayout = WGPUPipelineLayout.getInstance(device, { compute: computePipeline.compute.code });
            reactive(wGPUPipelineLayout).gpuPipelineLayout;
            const layout = wGPUPipelineLayout.gpuPipelineLayout;

            const gpuProgrammableStage = WGPUComputeStage.getInstance(device, computeStage);
            reactive(gpuProgrammableStage).gpuComputeStage;
            const gpuComputeStage = gpuProgrammableStage.gpuComputeStage;

            const pipeline = device.createComputePipeline({
                layout,
                compute: gpuComputeStage,
            });

            r_this.gpuComputePipeline = pipeline;
        });
    }

    private _onMap(device: GPUDevice, computePipeline: ComputePipeline)
    {
        device.computePipelines ??= new WeakMap<ComputePipeline, WGPUComputePipeline>();
        device.computePipelines.set(computePipeline, this);
        this.destroyCall(() => { device.computePipelines.delete(computePipeline); });
    }

    static getInstance(device: GPUDevice, computePipeline: ComputePipeline)
    {
        return device.computePipelines?.get(computePipeline) || new WGPUComputePipeline(device, computePipeline);
    }
}


declare global
{
    interface GPUDevice
    {
        computePipelines: WeakMap<ComputePipeline, WGPUComputePipeline>;
    }
}