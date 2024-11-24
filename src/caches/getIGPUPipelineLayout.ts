import { IGPUComputePipeline } from "../data/IGPUComputeObject";
import { IGPURenderPipeline } from "../data/IGPURenderObject";
import { IGPUBindGroupLayoutDescriptor, IGPUPipelineLayoutDescriptor } from "../internal/IGPUPipelineLayoutDescriptor";
import { getGPUShaderLayout } from "./getWGSLReflectInfo";

/**
 * 从GPU管线中获取管线布局。
 *
 * @param pipeline GPU管线。
 * @returns 管线布局。
 */
export function getIGPUPipelineLayout(pipeline: IGPURenderPipeline | IGPUComputePipeline): IGPUPipelineLayoutDescriptor
{
    const vertexCode = (pipeline as IGPURenderPipeline).vertex?.code;
    const fragmentCode = (pipeline as IGPURenderPipeline).fragment?.code;
    const computeCode = (pipeline as IGPUComputePipeline).compute?.code;
    //
    const code = vertexCode + fragmentCode + computeCode;
    //
    let gpuPipelineLayout = gpuPipelineLayoutMap[code];
    if (gpuPipelineLayout) return gpuPipelineLayout;

    let bindGroupLayouts: IGPUBindGroupLayoutDescriptor[] = [];
    if (vertexCode)
    {
        const shaderLayout = getGPUShaderLayout(vertexCode);
        bindGroupLayouts = mergeBindGroupLayouts(bindGroupLayouts, shaderLayout.bindGroupLayouts);
    }
    if (fragmentCode)
    {
        const shaderLayout = getGPUShaderLayout(fragmentCode);
        bindGroupLayouts = mergeBindGroupLayouts(bindGroupLayouts, shaderLayout.bindGroupLayouts);
    }
    if (computeCode)
    {
        const shaderLayout = getGPUShaderLayout(computeCode);
        bindGroupLayouts = mergeBindGroupLayouts(bindGroupLayouts, shaderLayout.bindGroupLayouts);
    }

    // 排除 undefined 元素。
    for (let i = 0; i < bindGroupLayouts.length; i++)
    {
        const entries = bindGroupLayouts[i].entries as GPUBindGroupLayoutEntry[];
        for (let i = entries.length - 1; i >= 0; i--)
        {
            if (!entries[i])
            {
                entries.splice(i, 1);
            }
        }
    }

    //
    gpuPipelineLayout = gpuPipelineLayoutMap[code] = { bindGroupLayouts };

    return gpuPipelineLayout;
}

function mergeBindGroupLayouts(bindGroupLayouts: IGPUBindGroupLayoutDescriptor[], bindGroupLayouts1: IGPUBindGroupLayoutDescriptor[]): IGPUBindGroupLayoutDescriptor[]
{
    bindGroupLayouts1.forEach((bindGroupLayout: IGPUBindGroupLayoutDescriptor, group: number) =>
    {
        bindGroupLayouts[group] = bindGroupLayouts[group] || { entries: [] };
        const entries = bindGroupLayouts[group].entries;

        bindGroupLayout.entries.forEach((entry) =>
        {
            const binding = entry.binding;
            if (!entries[binding])
            {
                entries[binding] = entry;
            }
            else
            {
                if (entry.variableInfo.name !== entry.variableInfo.name)
                {
                    console.error(`在管线中 @group(${group}) @binding(${binding}) 处存在多个定义 ${entries[binding].variableInfo.name} ${entry.variableInfo.name} 。`);
                }
            }
        });
    });

    return bindGroupLayouts;
}



const gpuPipelineLayoutMap: { [key: string]: IGPUPipelineLayoutDescriptor } = {};
