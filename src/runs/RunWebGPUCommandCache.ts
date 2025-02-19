import { IRenderObject, IRenderPassObject } from "@feng3d/render-api";

import { watcher } from "@feng3d/watcher";
import { getRealGPUBindGroup } from "../const";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { ChainMap } from "../utils/ChainMap";
import { RunWebGPU } from "./RunWebGPU";

/**
 * 套壳模式（RunWebGPUCommandCache）优于覆盖函数(RunWebGPUCommandCache1)的形式。
 */
export class RunWebGPUCommandCache extends RunWebGPU
{
    protected runRenderPassObjects(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormat: IGPURenderPassFormat, renderObjects?: IRenderPassObject[])
    {
        const map: ChainMap<[string, IRenderPassObject[]], { commands: Array<any>, setBindGroupCommands: Array<any> }> = device["_IGPURenderPassObjectsCommandMap"] = device["_IGPURenderPassObjectsCommandMap"] || new ChainMap();
        let caches = map.get([renderPassFormat._key, renderObjects]);
        if (!caches)
        {
            // 收集命令
            const renderPassRecord = new GPURenderPassRecord();
            const commands = renderPassRecord["_commands"] = [];

            super.runRenderPassObjects(device, renderPassRecord, renderPassFormat, renderObjects);

            // 排除无效命令
            paichuWuxiaoCommands(renderPassFormat.attachmentSize, commands);

            //
            const setBindGroupCommands = commands.filter((v) => v[0] === "setBindGroup");

            caches = { commands, setBindGroupCommands };

            map.set([renderPassFormat._key, renderObjects], caches);

            // 监听变化
            const onchanged = () =>
            {
                map.delete([renderPassFormat._key, renderObjects]);
                //
                renderObjects.forEach((v) => { watcher.unwatch(v, "_version", onchanged); });
            };
            renderObjects.forEach((v) => { watcher.watch(v, "_version", onchanged); });
        }

        // 执行命令
        runCommands(passEncoder, caches);
    }

    protected runRenderBundleObjects(device: GPUDevice, bundleEncoder: GPURenderBundleEncoder, renderPassFormat: IGPURenderPassFormat, renderObjects?: IRenderObject[])
    {
        const map: ChainMap<[string, IRenderObject[]], { commands: Array<any>, setBindGroupCommands: Array<any> }> = device["_IGPURenderPassObjectsCommandMap"] = device["_IGPURenderPassObjectsCommandMap"] || new ChainMap();
        let caches = map.get([renderPassFormat._key, renderObjects]);
        if (!caches)
        {
            // 收集命令
            // const renderBundleRecord = new GPURenderBundleRecord();
            const renderBundleRecord = new GPURenderPassRecord();
            const commands = renderBundleRecord["_commands"] = [];

            super.runRenderBundleObjects(device, renderBundleRecord as any, renderPassFormat, renderObjects);

            // 排除无效命令
            paichuWuxiaoCommands(renderPassFormat.attachmentSize, commands);
            //
            const setBindGroupCommands = commands.filter((v) => v[0] === "setBindGroup");

            caches = { commands, setBindGroupCommands };

            map.set([renderPassFormat._key, renderObjects], caches);

            // 监听变化
            const onchanged = () =>
            {
                map.delete([renderPassFormat._key, renderObjects]);
                //
                renderObjects.forEach((v) => { watcher.unwatch(v, "_version", onchanged); });
            };
            renderObjects.forEach((v) => { watcher.watch(v, "_version", onchanged); });
        }

        // 排除在 GPURenderBundleEncoder 中不支持的命令
        const commands = caches.commands.filter((v) => (v[0] in bundleEncoder));

        // 执行命令
        runCommands(bundleEncoder, { ...caches, commands });
    }

    protected runRenderObject(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPassFormat: IGPURenderPassFormat, renderObject: IRenderObject)
    {
        const map: ChainMap<[string, IRenderObject], Array<any>> = device["_IGPURenderObjectCommandMap"] = device["_IGPURenderObjectCommandMap"] || new ChainMap();
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

        // 
        const onchanged = () =>
        {
            map.delete([renderPassFormat._key, renderObject]);
            //
            renderObject._version = ~~renderObject._version + 1;
            watcher.unwatch(renderObject.pipeline, '_version', onchanged);
        }
        watcher.watch(renderObject.pipeline, '_version', onchanged);
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

function runCommands(_passEncoder: GPURenderPassEncoder | GPUComputePassEncoder | GPURenderBundleEncoder, caches: {
    commands: Array<any>;
    setBindGroupCommands: Array<any>;
})
{
    const { commands, setBindGroupCommands } = caches;

    setBindGroupCommands.forEach((v) =>
    {
        v[1][1] = v[1][1][getRealGPUBindGroup]();
    });

    commands.forEach((v) =>
    {
        _passEncoder[v[0]].apply(_passEncoder, v[1]);
    });
}

function paichuWuxiaoCommands(attachmentSize: { readonly width: number; readonly height: number; }, commands: any[])
{
    const _obj = {
        setBindGroup: [], setVertexBuffer: [],
        setViewport: [0, 0, attachmentSize.width, attachmentSize.height, 0, 1],
        setScissorRect: [0, 0, attachmentSize.width, attachmentSize.height],
    };
    //
    let length = 0;
    commands.concat().forEach((v) =>
    {
        // 排除重复的无效命令
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