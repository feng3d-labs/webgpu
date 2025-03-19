import { ChainMap, RenderObject, RenderPassObject } from "@feng3d/render-api";

import { watcher } from "@feng3d/watcher";
import { GPURenderOcclusionQuery } from "./caches/getGPURenderOcclusionQuery";
import { getRealGPUBindGroup } from "./const";
import { RenderPassFormat } from "./internal/RenderPassFormat";
import { WebGPUBase } from "./WebGPUBase";

/**
 * 缓存命令，优化性能。
 */
export class WebGPUCache extends WebGPUBase
{
    protected runRenderPassObjects(passEncoder: GPURenderPassEncoder, renderPassFormat: RenderPassFormat, renderObjects: RenderPassObject[], occlusionQuery: GPURenderOcclusionQuery)
    {
        const device = this._device;
        const renderPassObjectsCommandKey: RenderPassObjectsCommandKey = [device, renderPassFormat, renderObjects];
        let caches = _renderPassObjectsCommandMap.get(renderPassObjectsCommandKey);
        if (!caches)
        {
            // 收集命令
            const renderPassRecord = new GPURenderPassRecord();
            const commands = renderPassRecord["_commands"] = [];

            super.runRenderPassObjects(renderPassRecord, renderPassFormat, renderObjects, occlusionQuery);

            // 排除无效命令
            paichuWuxiaoCommands(renderPassFormat.attachmentSize, commands);

            //
            const setBindGroupCommands = commands.filter((v) => v[0] === "setBindGroup");

            caches = { commands, setBindGroupCommands };

            _renderPassObjectsCommandMap.set(renderPassObjectsCommandKey, caches);

            // 监听变化
            const onchanged = () =>
            {
                _renderPassObjectsCommandMap.delete(renderPassObjectsCommandKey);
                //
                renderObjects.forEach((v) => { watcher.unwatch(v, "_version" as any, onchanged); });
            };
            renderObjects.forEach((v) => { watcher.watch(v, "_version" as any, onchanged); });
        }

        // 执行命令
        runCommands(passEncoder, caches);
    }

    protected runRenderBundleObjects(bundleEncoder: GPURenderBundleEncoder, renderPassFormat: RenderPassFormat, renderObjects?: RenderObject[])
    {
        const device = this._device;
        const renderPassObjectsCommandKey: RenderPassObjectsCommandKey = [device, renderPassFormat, renderObjects];
        let caches = _renderPassObjectsCommandMap.get(renderPassObjectsCommandKey);
        if (!caches)
        {
            // 收集命令
            // const renderBundleRecord = new GPURenderBundleRecord();
            const renderBundleRecord = new GPURenderPassRecord();
            const commands = renderBundleRecord["_commands"] = [];

            super.runRenderBundleObjects(renderBundleRecord as any, renderPassFormat, renderObjects);

            // 排除无效命令
            paichuWuxiaoCommands(renderPassFormat.attachmentSize, commands);
            //
            const setBindGroupCommands = commands.filter((v) => v[0] === "setBindGroup");

            caches = { commands, setBindGroupCommands };

            _renderPassObjectsCommandMap.set(renderPassObjectsCommandKey, caches);

            // 监听变化
            const onchanged = () =>
            {
                _renderPassObjectsCommandMap.delete(renderPassObjectsCommandKey);
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

    protected runRenderObject(passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPassFormat: RenderPassFormat, renderObject: RenderObject)
    {
        const device = this._device;
        const _commands = passEncoder["_commands"] as any[];

        const renderObjectCommandKey: RenderObjectCommandKey = [device, renderPassFormat, renderObject];
        const commands = renderObjectCommandMap.get(renderObjectCommandKey);
        if (commands)
        {
            commands.forEach((v) => _commands.push(v));

            return;
        }

        const start = _commands.length;

        super.runRenderObject(passEncoder, renderPassFormat, renderObject);

        renderObjectCommandMap.set(renderObjectCommandKey, _commands.slice(start));

        // 
        const onchanged = () =>
        {
            renderObjectCommandMap.delete(renderObjectCommandKey);
            //
            renderObject._version = ~~renderObject._version + 1;
            watcher.unwatch(renderObject.pipeline, '_version', onchanged);
        }
        watcher.watch(renderObject.pipeline, '_version', onchanged);
    }
}
type RenderObjectCommandKey = [device: GPUDevice, renderPassFormat: RenderPassFormat, renderObject: RenderObject];
const renderObjectCommandMap = new ChainMap<RenderObjectCommandKey, Array<any>>();

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

/**
 * 排除无效命令
 *
 * @param attachmentSize
 */
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

type RenderPassObjectsCommandKey = [device: GPUDevice, renderPassFormat: RenderPassFormat, renderObjects: RenderPassObject[]];
const _renderPassObjectsCommandMap = new ChainMap<RenderPassObjectsCommandKey, {
    commands: Array<any>;
    setBindGroupCommands: Array<any>;
}>;