import { UnReadonly } from "@feng3d/render-api";
import { ComputePipeline } from "../data/ComputePipeline";
import { ComputeStage } from "../data/ComputeStage";
import { getWGSLReflectInfo } from "./getWGSLReflectInfo";

/**
 * 从渲染管线描述、渲染通道描述以及完整的顶点属性数据映射获得完整的渲染管线描述以及顶点缓冲区数组。
 *获取完整的计算管线描述。
 *
 * @param computePipeline 计算管线描述。
 * @returns 完整的计算管线描述。
 */
export function getIGPUComputePipeline(computePipeline: ComputePipeline): ComputePipeline
{


    return computePipeline;
}

