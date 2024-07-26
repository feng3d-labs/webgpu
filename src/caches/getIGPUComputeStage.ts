import { IGPUComputeStage, IGPUProgrammableStage } from "../data/IGPUComputeObject";
import { getWGSLReflectInfo } from "./getWGSLReflectInfo";

/**
 * 获取计算阶段完整描述。
 *
 * @param computeStage 计算阶段描述。
 * @returns 计算阶段完整描述。
 */
export function getIGPUComputeStage(computeStage: IGPUProgrammableStage)
{
    let gpuComputeState = computeStateMap.get(computeStage);
    if (!gpuComputeState)
    {
        const code = computeStage.code;
        let entryPoint = computeStage.entryPoint;
        if (!entryPoint)
        {
            const reflect = getWGSLReflectInfo(code);
            console.assert(reflect.computeEntryList.length > 0, `WGSL着色器 ${code} 中不存在计算入口点。`);
            entryPoint = reflect.computeEntryList[0].entryPoint;
        }
        else
        {
            // 验证着色器中包含指定片段入口函数。
            const reflect = getWGSLReflectInfo(code);
            console.assert(!!reflect.computeEntryMap[entryPoint], `WGSL着色器 ${code} 中不存在指定的计算入口点 ${entryPoint}`);
        }

        gpuComputeState = {
            code,
            entryPoint,
        };

        if (computeStage.constants)
        {
            gpuComputeState.constants = computeStage.constants;
        }

        computeStateMap.set(computeStage, gpuComputeState);
    }

    return gpuComputeState;
}

const computeStateMap = new Map<IGPUProgrammableStage, IGPUComputeStage>();
