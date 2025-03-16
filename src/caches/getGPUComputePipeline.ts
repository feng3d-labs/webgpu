import { UnReadonly } from "@feng3d/render-api";
import { ComputePipeline } from "../data/ComputePipeline";
import { ComputeStage } from "../data/ComputeStage";
import { getGPUPipelineLayout } from "./getGPUPipelineLayout";
import { getGPUShaderModule } from "./getGPUShaderModule";
import { getWGSLReflectInfo } from "./getWGSLReflectInfo";

export function getGPUComputePipeline(device: GPUDevice, computePipeline: ComputePipeline)
{
    let pipeline = device._computePipelineMap.get(computePipeline);
    if (pipeline) return pipeline;

    const computeStage = computePipeline.compute;

    const reflect = getWGSLReflectInfo(computeStage.code);
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
    const layout = getGPUPipelineLayout(device, computePipeline);

    pipeline = device.createComputePipeline({
        layout,
        compute: {
            ...computeStage,
            module: getGPUShaderModule(device, computeStage.code),
        },
    });
    device._computePipelineMap.set(computePipeline, pipeline);

    return pipeline;
}

