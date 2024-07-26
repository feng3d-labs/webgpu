import { IFragmentState } from "../data/IFragmentState";
import { IGPUFragmentState } from "../data/IGPURenderObject";
import { IRenderPass } from "../data/IRenderPass";
import { ChainMap } from "../utils/ChainMap";
import { getIRenderPassColorAttachmentFormats } from "./getIGPURenderPass";
import { getWGSLReflectInfo } from "./getWGSLReflectInfo";

/**
 * 获取片段阶段完整描述。
 *
 * @param fragmentState 片段简单阶段。
 * @param colorAttachmentTextureFormats 颜色附件格式。
 * @returns 片段阶段完整描述。
 */
export function getIGPUFragmentState(device: GPUDevice, fragmentState: IFragmentState, renderPass: IRenderPass)
{
    if (!fragmentState)
    {
        return undefined;
    }

    let gpuFragmentState = fragmentStateMap.get([fragmentState, renderPass]);
    if (!gpuFragmentState)
    {
        // 获取渲染通道附件纹理格式。
        const colorAttachmentTextureFormats = getIRenderPassColorAttachmentFormats(device, renderPass);

        const code = fragmentState.code;
        let entryPoint = fragmentState.entryPoint;
        if (!entryPoint)
        {
            const reflect = getWGSLReflectInfo(code);
            console.assert(reflect.fragmentEntryList.length > 0, `WGSL着色器 ${code} 中不存在片元入口点。`);
            entryPoint = reflect.fragmentEntryList[0].entryPoint;
        }
        else
        {
            // 验证着色器中包含指定片段入口函数。
            const reflect = getWGSLReflectInfo(code);
            console.assert(!!reflect.fragmentEntryMap[entryPoint], `WGSL着色器 ${code} 中不存在指定的片元入口点 ${entryPoint} 。`);
        }

        const targets = colorAttachmentTextureFormats.map((v, i) =>
        {
            if (!v) return undefined;

            const gpuColorTargetState: GPUColorTargetState = { format: v };

            const colorTargetState = fragmentState.targets?.[i];
            if (colorTargetState)
            {
                Object.assign(gpuColorTargetState, colorTargetState);
            }

            return gpuColorTargetState;
        });

        gpuFragmentState = {
            code,
            entryPoint,
            targets,
        };

        if (fragmentState.constants)
        {
            gpuFragmentState.constants = fragmentState.constants;
        }

        fragmentStateMap.set([fragmentState, renderPass], gpuFragmentState);
    }

    return gpuFragmentState;
}

const fragmentStateMap = new ChainMap<[IFragmentState, IRenderPass], IGPUFragmentState>();
