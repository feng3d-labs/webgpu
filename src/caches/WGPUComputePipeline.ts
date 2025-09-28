import { reactive } from '@feng3d/reactivity';
import { ComputePipeline } from '../data/ComputePipeline';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUBindGroupLayout } from './WGPUBindGroupLayout';
import { WGPUPipelineLayout } from './WGPUPipelineLayout';
import { WGPUShaderModule } from './WGPUShaderModule';
import { WgslReflectManager } from './WgslReflectManager';

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
            r_computePipeline.compute.code;
            r_computePipeline.compute.entryPoint;
            r_computePipeline.compute.constants;

            const computeStage = computePipeline.compute;
            const code = computeStage.code;
            const constants = computeStage.constants;
            let entryPoint = computeStage.entryPoint;

            const pipelineLayout = WGPUPipelineLayout.getPipelineLayout({ compute: code });

            const bindGroupLayouts: GPUBindGroupLayout[] = pipelineLayout.bindGroupLayouts.map((v) =>
            {
                const gpuBindGroupLayout = WGPUBindGroupLayout.getGPUBindGroupLayout(device, v);

                return gpuBindGroupLayout;
            });

            const descriptor: GPUPipelineLayoutDescriptor = { bindGroupLayouts };

            const gpuPipelineLayout = device.createPipelineLayout(descriptor);

            //
            const module = WGPUShaderModule.getGPUShaderModule(device, code);

            //
            if (!entryPoint)
            {
                const reflect = WgslReflectManager.getWGSLReflectInfo(code);
                entryPoint = reflect.entry.compute[0].name;
            }

            //
            const gpuComputeStage: GPUProgrammableStage = {
                entryPoint,
                constants,
                module,
            };

            //
            const pipeline = device.createComputePipeline({
                layout: gpuPipelineLayout,
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