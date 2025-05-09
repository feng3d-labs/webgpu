import { Computed, computed, reactive } from "@feng3d/reactivity";
import { VertexState } from "@feng3d/render-api";
import { FunctionInfo } from "wgsl_reflect";

import { getWGSLReflectInfo } from "./getWGSLReflectInfo";

/**
 * 获取顶点入口函数信息。
 * 
 * @param vertexState 顶点阶段信息。
 * @returns 
 */
export function getVertexEntryFunctionInfo(vertexState: VertexState)
{
    let result: Computed<FunctionInfo> = _getVertexEntryFunctionInfoMap.get(vertexState);
    if (result) return result.value;

    result = computed(() =>
    {
        // 监听
        const r_vertexState = reactive(vertexState);
        r_vertexState.code;
        r_vertexState.entryPoint;

        // 计算
        const { code, entryPoint } = vertexState;
        // 解析顶点着色器
        const reflect = getWGSLReflectInfo(code);
        //
        let vertexEntryFunctionInfo: FunctionInfo;
        if (entryPoint)
        {
            vertexEntryFunctionInfo = reflect.entry.vertex.filter((v) => v.name === entryPoint)[0];
            console.assert(!!vertexEntryFunctionInfo, `WGSL着色器 ${code} 中不存在顶点入口点 ${entryPoint} 。`);
        }
        else
        {
            vertexEntryFunctionInfo = reflect.entry.vertex[0];
            console.assert(!!reflect.entry.vertex[0], `WGSL着色器 ${code} 中不存在顶点入口点。`);
        }

        return vertexEntryFunctionInfo;
    });
    _getVertexEntryFunctionInfoMap.set(vertexState, result);

    return result.value;
}
const _getVertexEntryFunctionInfoMap = new WeakMap<VertexState, Computed<FunctionInfo>>();