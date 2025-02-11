import { FunctionInfo } from "wgsl_reflect";
import { getWGSLReflectInfo } from "./getWGSLReflectInfo";
import { IGPUComputePipeline } from "../data/IGPUComputePipeline";
import { IGPUComputeStage } from "../data/IGPUComputeStage";

/**
 * 从渲染管线描述、渲染通道描述以及完整的顶点属性数据映射获得完整的渲染管线描述以及顶点缓冲区数组。
 *获取完整的计算管线描述。
 *
 * @param computePipeline 计算管线描述。
 * @returns 完整的计算管线描述。
 */
export function getIGPUComputePipeline(computePipeline: IGPUComputePipeline): IGPUComputePipeline
{
    let gpuComputePipeline = computePipelineMap.get(computePipeline);
    if (gpuComputePipeline) return gpuComputePipeline;

    const gpuComputeStage = getIGPUComputeStage(computePipeline.compute);

    gpuComputePipeline = {
        ...computePipeline,
        compute: gpuComputeStage,
    };

    computePipelineMap.set(computePipeline, gpuComputePipeline);

    return gpuComputePipeline;
}

const computePipelineMap = new Map<IGPUComputePipeline, IGPUComputePipeline>();

/**
* 获取计算阶段完整描述。
*
* @param computeStage 计算阶段描述。
* @returns 计算阶段完整描述。
*/
function getIGPUComputeStage(computeStage: IGPUComputeStage)
{
    const reflect = getWGSLReflectInfo(computeStage.code);
    let compute: FunctionInfo;
    if (!computeStage.entryPoint)
    {
        compute = reflect.entry.compute[0];
        console.assert(!!compute, `WGSL着色器 ${computeStage.code} 中不存在计算入口点。`);
        (computeStage as any).entryPoint = compute.name;
    }
    else
    {
        // 验证着色器中包含指定片段入口函数。
        compute = reflect.entry.compute.filter((v) => v.name === computeStage.entryPoint)[0];
        console.assert(!!compute, `WGSL着色器 ${computeStage.code} 中不存在指定的计算入口点 ${computeStage.entryPoint}`);
    }

    return computeStage;
}
