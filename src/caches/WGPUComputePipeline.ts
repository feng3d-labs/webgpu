import { reactive, UnReadonly } from '@feng3d/reactivity';
import { ComputePipeline } from '../data/ComputePipeline';
import { ComputeStage } from '../data/ComputeStage';
import { ReactiveObject } from '../ReactiveObject';
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
            r_computePipeline.compute;

            const computeStage = computePipeline.compute;

            const reflect = WgslReflectManager.getWGSLReflectInfo(computeStage.code);

            if (!computeStage.entryPoint)
            {
                const compute = reflect.entry.compute[0];

                console.assert(!!compute, `WGSL着色器 ${computeStage.code} 中不存在计算入口点。`);
                (computeStage as UnReadonly<ComputeStage>).entryPoint = compute.name;
            }
            else
            {
                // 验证着色器中包含指定片段入口函数。
                const compute = reflect.entry.compute.filter((v) => v.name === computeStage.entryPoint)[0];

                console.assert(!!compute, `WGSL着色器 ${computeStage.code} 中不存在指定的计算入口点 ${computeStage.entryPoint}`);
            }

            // 从GPU管线中获取管线布局。
            const wGPUPipelineLayout = WGPUPipelineLayout.getInstance(device, { compute: computePipeline.compute.code });
            reactive(wGPUPipelineLayout).gpuPipelineLayout;
            const layout = wGPUPipelineLayout.gpuPipelineLayout;

            const pipeline = device.createComputePipeline({
                layout,
                compute: {
                    ...computeStage,
                    module: WGPUShaderModule.getGPUShaderModule(device, computeStage.code),
                },
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