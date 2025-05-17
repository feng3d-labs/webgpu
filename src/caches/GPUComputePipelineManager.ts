import { ChainMap, UnReadonly } from '@feng3d/render-api';
import { ComputePipeline } from '../data/ComputePipeline';
import { ComputeStage } from '../data/ComputeStage';
import { GPUPipelineLayoutManager } from './GPUPipelineLayoutManager';
import { GPUShaderModuleManager } from './GPUShaderModuleManager';
import { WgslReflectManager } from './WgslReflectManager';

export class GPUComputePipelineManager
{
    static getGPUComputePipeline(device: GPUDevice, computePipeline: ComputePipeline)
    {
        const getGPUComputePipelineKey: GetGPUComputePipeline = [device, computePipeline];
        let pipeline = GPUComputePipelineManager._computePipelineMap.get(getGPUComputePipelineKey);

        if (pipeline) return pipeline;

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
        const layout = GPUPipelineLayoutManager.getGPUPipelineLayout(device, { compute: computePipeline.compute.code });

        pipeline = device.createComputePipeline({
            layout,
            compute: {
                ...computeStage,
                module: GPUShaderModuleManager.getGPUShaderModule(device, computeStage.code),
            },
        });
        GPUComputePipelineManager._computePipelineMap.set(getGPUComputePipelineKey, pipeline);

        return pipeline;
    }

    private static readonly _computePipelineMap = new ChainMap<GetGPUComputePipeline, GPUComputePipeline>();
}

type GetGPUComputePipeline = [device: GPUDevice, computePipeline: ComputePipeline];