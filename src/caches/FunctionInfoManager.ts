import { FunctionInfo } from "wgsl_reflect";

import { WgslReflectManager } from "./WgslReflectManager";

export class FunctionInfoManager
{
    /**
     * 获取顶点入口函数信息。
     *
     * @param vertexState 顶点阶段信息。
     * @returns
     */
    static getVertexEntryFunctionInfo(code: string, entryPoint?: string)
    {
        // 解析顶点着色器
        const reflect = WgslReflectManager.getWGSLReflectInfo(code);
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
    }
}
