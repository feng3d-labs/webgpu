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
    let vertexEntryFunctionInfo: FunctionInfo = vertexState["_vertexEntry"];
    if (vertexEntryFunctionInfo) return vertexEntryFunctionInfo;

    const code = vertexState.code;

    // 解析顶点着色器
    const reflect = getWGSLReflectInfo(code);
    //
    if (vertexState.entryPoint)
    {
        vertexEntryFunctionInfo = reflect.entry.vertex.filter((v) => v.name === vertexState.entryPoint)[0];
        console.assert(!!vertexEntryFunctionInfo, `WGSL着色器 ${code} 中不存在顶点入口点 ${vertexState.entryPoint} 。`);
    }
    else
    {
        vertexEntryFunctionInfo = reflect.entry.vertex[0];
        console.assert(!!reflect.entry.vertex[0], `WGSL着色器 ${code} 中不存在顶点入口点。`);
    }

    vertexState["_vertexEntry"] = vertexEntryFunctionInfo;

    return vertexEntryFunctionInfo;
}
