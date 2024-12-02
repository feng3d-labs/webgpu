import { getRealGPUBindGroup } from "../const";
import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPassObject } from "../data/IGPURenderPass";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { ChainMap } from "../utils/ChainMap";
import { RunWebGPU } from "./RunWebGPU";

/**
 * 套壳模式（RunWebGPUCommandCache）优于覆盖函数(RunWebGPUCommandCache1)的形式。
 */
export class RunWebGPUCommandCache extends RunWebGPU
{
    protected runRenderPassObjects(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormat: IGPURenderPassFormat, renderObjects?: IGPURenderPassObject[])
    {
        const map: ChainMap<[string, IGPURenderPassObject[]], Array<any>> = device["_IGPURenderPassObjectsCommandMap"] = device["_IGPURenderPassObjectsCommandMap"] || new ChainMap();
        let commands = map.get([renderPassFormat._key, renderObjects]);
        if (!commands)
        {
            // 收集命令
            const renderPassRecord = new GPURenderPassRecord();
            renderPassRecord["_commands"] = commands = [];
            map.set([renderPassFormat._key, renderObjects], commands);

            super.runRenderPassObjects(device, renderPassRecord, renderPassFormat, renderObjects);

            // 排除无效命令
            paichuWuxiaoCommands(commands);
        }

        // 执行命令
        runCommands(passEncoder, commands);
    }

    protected runRenderBundleObjects(device: GPUDevice, bundleEncoder: GPURenderBundleEncoder, renderPassFormat: IGPURenderPassFormat, renderObjects?: IGPURenderObject[])
    {
        const map: ChainMap<[string, IGPURenderObject[]], Array<any>> = device["_IGPURenderPassObjectsCommandMap"] = device["_IGPURenderPassObjectsCommandMap"] || new ChainMap();
        let commands = map.get([renderPassFormat._key, renderObjects]);
        if (!commands)
        {
            // 收集命令
            const renderBundleRecord = new GPURenderBundleRecord();
            renderBundleRecord["_commands"] = commands = [];
            map.set([renderPassFormat._key, renderObjects], commands);

            super.runRenderBundleObjects(device, renderBundleRecord, renderPassFormat, renderObjects);

            // 排除无效命令
            paichuWuxiaoCommands(commands);
        }

        // 执行命令
        runCommands(bundleEncoder, commands);
    }

    protected runRenderObject(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPassFormat: IGPURenderPassFormat, renderObject: IGPURenderObject)
    {
        const map: ChainMap<[string, IGPURenderObject], Array<any>> = device["_IGPURenderObjectCommandMap"] = device["_IGPURenderObjectCommandMap"] || new ChainMap();
        const _commands = passEncoder["_commands"] as any[];

        const commands = map.get([renderPassFormat._key, renderObject]);
        if (commands)
        {
            commands.forEach((v) => _commands.push(v));

            return;
        }

        const start = _commands.length;

        super.runRenderObject(device, passEncoder, renderPassFormat, renderObject);

        map.set([renderPassFormat._key, renderObject], _commands.slice(start));
    }
}

class GPURenderBundleRecord implements GPURenderBundleEncoder
{
    __brand: "GPURenderBundleEncoder";
    label: string;
    //
    setPipeline(...args: any): undefined { this["_commands"].push(["setPipeline", args]); }
    setVertexBuffer(...args: any): undefined { this["_commands"].push(["setVertexBuffer", args]); }
    setIndexBuffer(...args: any): undefined { this["_commands"].push(["setIndexBuffer", args]); }
    setBindGroup(...args: any): undefined { this["_commands"].push(["setBindGroup", args]); }
    draw(...args: any): undefined { this["_commands"].push(["draw", args]); }
    drawIndexed(...args: any): undefined { this["_commands"].push(["drawIndexed", args]); }
    drawIndirect(...args: any): undefined { this["_commands"].push(["drawIndirect", args]); }
    drawIndexedIndirect(...args: any): undefined { this["_commands"].push(["drawIndexedIndirect", args]); }
    //
    finish(...args: any): undefined { this["_commands"].push(["finish", args]); }
    //
    pushDebugGroup(...args: any): undefined { this["_commands"].push(["pushDebugGroup", args]); }
    popDebugGroup(...args: any): undefined { this["_commands"].push(["popDebugGroup", args]); }
    insertDebugMarker(...args: any): undefined { this["_commands"].push(["insertDebugMarker", args]); }
}

class GPURenderPassRecord implements GPURenderPassEncoder
{
    __brand: "GPURenderPassEncoder" = "GPURenderPassEncoder";
    label: string;
    //
    setViewport(...args: any): undefined { this["_commands"].push(["setViewport", args]); }
    setScissorRect(...args: any): undefined { this["_commands"].push(["setScissorRect", args]); }
    setBlendConstant(...args: any): undefined { this["_commands"].push(["setBlendConstant", args]); }
    setStencilReference(...args: any): undefined { this["_commands"].push(["setStencilReference", args]); }
    //
    setPipeline(...args: any): undefined { this["_commands"].push(["setPipeline", args]); }
    setVertexBuffer(...args: any): undefined { this["_commands"].push(["setVertexBuffer", args]); }
    setIndexBuffer(...args: any): undefined { this["_commands"].push(["setIndexBuffer", args]); }
    setBindGroup(...args: any): undefined { this["_commands"].push(["setBindGroup", args]); }
    draw(...args: any): undefined { this["_commands"].push(["draw", args]); }
    drawIndexed(...args: any): undefined { this["_commands"].push(["drawIndexed", args]); }
    drawIndirect(...args: any): undefined { this["_commands"].push(["drawIndirect", args]); }
    drawIndexedIndirect(...args: any): undefined { this["_commands"].push(["drawIndexedIndirect", args]); }
    //
    beginOcclusionQuery(...args: any): undefined { this["_commands"].push(["beginOcclusionQuery", args]); }
    endOcclusionQuery(...args: any): undefined { this["_commands"].push(["endOcclusionQuery", args]); }
    //
    executeBundles(...args: any): undefined { this["_commands"].push(["executeBundles", args]); }
    //
    end(...args: any): undefined { this["_commands"].push(["end", args]); }
    //
    pushDebugGroup(...args: any): undefined { this["_commands"].push(["pushDebugGroup", args]); }
    popDebugGroup(...args: any): undefined { this["_commands"].push(["popDebugGroup", args]); }
    insertDebugMarker(...args: any): undefined { this["_commands"].push(["insertDebugMarker", args]); }
}

function runCommands(_passEncoder: GPURenderPassEncoder | GPUComputePassEncoder | GPURenderBundleEncoder, commands: any[])
{
    commands.forEach((v) =>
    {
        if (v[0] === "setBindGroup")
        {
            v[1][1] = v[1][1][getRealGPUBindGroup]();
            //
            _passEncoder[v[0]].apply(_passEncoder, v[1]);
        }
        else
        {
            _passEncoder[v[0]].apply(_passEncoder, v[1]);
        }
    });
}

function paichuWuxiaoCommands(commands: any[])
{
    const _obj = { setBindGroup: [], setVertexBuffer: [] };
    //
    let length = 0;
    commands.concat().forEach((v) =>
    {
        if (v[0] === "setBindGroup" || v[0] === "setVertexBuffer")
        {
            if (!arrayEq1(_obj, v[0], v[1][0], v[1]))
            {
                commands[length++] = v;
            }
        }
        else if (0
            || v[0] === "setPipeline"
            || v[0] === "setIndexBuffer"
            || v[0] === "setViewport"
            || v[0] === "setScissorRect"
            || v[0] === "setBlendConstant"
            || v[0] === "setStencilReference"
        )
        {
            if (!arrayEq0(_obj, v[0], v[1]))
            {
                commands[length++] = v;
            }
        }
        else
        {
            commands[length++] = v;
        }
    });
    commands.length = length;
}

function arrayEq0(_obj: any, name: string, args: any[])
{
    const obj = _obj;
    const oldArgs: any[] = obj[name];
    if (!oldArgs)
    {
        obj[name] = args;

        return false;
    }

    for (let i = 0, n = oldArgs.length; i < n; i++)
    {
        if (oldArgs[i] !== args[i])
        {
            obj[name] = args;

            return false;
        }
    }

    return true;
}

function arrayEq1(_obj: any, name: string, index: number, args: any[])
{
    const obj = _obj[name];
    const oldArgs: any[] = obj[index];
    if (!oldArgs)
    {
        obj[index] = args;

        return false;
    }

    for (let i = 1, n = oldArgs.length; i < n; i++)
    {
        if (oldArgs[i] !== args[i])
        {
            obj[index] = args;

            return false;
        }
    }

    return true;
}