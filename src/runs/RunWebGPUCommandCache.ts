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
            const passEncoderCache = new GPURenderPassEncoderCommandCache(passEncoder);
            passEncoderCache["_commands"] = commands = [];
            map.set([renderPassFormat._key, renderObjects], commands);

            super.runRenderPassObjects(device, passEncoderCache, renderPassFormat, renderObjects);
        }
        runCommands(passEncoder, commands);
    }

    protected runRenderBundleObjects(device: GPUDevice, bundleEncoder: GPURenderBundleEncoder, renderPassFormat: IGPURenderPassFormat, renderObjects?: IGPURenderObject[])
    {
        const map: ChainMap<[string, IGPURenderObject[]], Array<any>> = device["_IGPURenderPassObjectsCommandMap"] = device["_IGPURenderPassObjectsCommandMap"] || new ChainMap();
        let commands = map.get([renderPassFormat._key, renderObjects]);
        if (!commands)
        {
            const bundleEncoderCache = new GPURenderBundleEncoderCommandCache(bundleEncoder);
            bundleEncoderCache["_commands"] = commands = [];
            map.set([renderPassFormat._key, renderObjects], commands);

            super.runRenderBundleObjects(device, bundleEncoderCache, renderPassFormat, renderObjects);
        }

        runCommands(bundleEncoder, commands);
    }

    protected runRenderObject(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPassFormat: IGPURenderPassFormat, renderObject: IGPURenderObject)
    {
        const map: ChainMap<[string, IGPURenderObject], Array<any>> = device["_IGPURenderObjectCommandMap"] = device["_IGPURenderObjectCommandMap"] || new ChainMap();
        const _commands = passEncoder["_commands"] as any[];

        let commands = map.get([renderPassFormat._key, renderObject]);
        if (commands)
        {
            runCommands((passEncoder as GPURenderPassEncoderCommandCache)._passEncoder, commands);
            commands.forEach((v) => _commands.push(v));

            return;
        }

        const start = _commands.length;

        super.runRenderObject(device, passEncoder, renderPassFormat, renderObject);

        map.set([renderPassFormat._key, renderObject], _commands.slice(start));
    }
}

class GPUPassEncoderCommandCache implements GPUCommandsMixin, GPUDebugCommandsMixin, GPUBindingCommandsMixin
{
    constructor(passEncoder: GPUCommandsMixin & GPUDebugCommandsMixin & GPUBindingCommandsMixin)
    {
        this._passEncoder = passEncoder;
    }

    setBindGroup(index: GPUIndex32, bindGroup: GPUBindGroup | null, dynamicOffsets?: Iterable<GPUBufferDynamicOffset>): undefined;
    setBindGroup(index: GPUIndex32, bindGroup: GPUBindGroup | null, dynamicOffsetsData: Uint32Array, dynamicOffsetsDataStart: GPUSize64, dynamicOffsetsDataLength: GPUSize32): undefined;
    setBindGroup(...args: any): undefined
    {
        if (this.arrayEq1("setBindGroup", args[0], args)) return;

        this["_commands"].push(["setBindGroup", args]);
    }

    pushDebugGroup(groupLabel: string): undefined
    {
        return this._passEncoder.pushDebugGroup(groupLabel);
    }
    popDebugGroup(): undefined
    {
        return this._passEncoder.popDebugGroup();
    }
    insertDebugMarker(markerLabel: string): undefined
    {
        return this._passEncoder.insertDebugMarker(markerLabel);
    }

    label: string;
    protected _passEncoder: GPUCommandsMixin & GPUDebugCommandsMixin & GPUBindingCommandsMixin;
    protected _obj = { setBindGroup: [], setVertexBuffer: [] };

    protected arrayEq0(name: string, args: any[])
    {
        const obj = this._obj;
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

    protected arrayEq1(name: string, index: number, args: any[])
    {
        const obj = this._obj[name];
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
}

class GPURenderCommandsCache extends GPUPassEncoderCommandCache implements GPURenderCommandsMixin
{
    protected _passEncoder: GPUCommandsMixin & GPUDebugCommandsMixin & GPUBindingCommandsMixin & GPURenderCommandsMixin;

    setPipeline(pipeline: GPURenderPipeline): undefined
    {
        if (this.arrayEq0("setPipeline", [pipeline])) return;

        this["_commands"].push(["setPipeline", [pipeline]]);
    }
    setIndexBuffer(buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64): undefined
    setIndexBuffer(...args: any): undefined
    {
        if (this.arrayEq0("setIndexBuffer", args)) return;

        this["_commands"].push(["setIndexBuffer", args]);
    }
    setVertexBuffer(slot: GPUIndex32, buffer: GPUBuffer | null, offset?: GPUSize64, size?: GPUSize64): undefined
    setVertexBuffer(...args: any): undefined
    {
        if (this.arrayEq1("setVertexBuffer", args[0], args)) return;

        this["_commands"].push(["setVertexBuffer", args]);
    }
    draw(vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32): undefined
    draw(...args: any): undefined
    {
        this["_commands"].push(["draw", args]);
    }

    drawIndexed(indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32): undefined
    drawIndexed(...args: any): undefined
    {
        this["_commands"].push(["drawIndexed", args]);
    }
    drawIndirect(indirectBuffer: GPUBuffer, indirectOffset: GPUSize64): undefined
    drawIndirect(...args: any): undefined
    {
        this["_commands"].push(["drawIndirect", args]);
    }
    drawIndexedIndirect(indirectBuffer: GPUBuffer, indirectOffset: GPUSize64): undefined
    drawIndexedIndirect(...args: any): undefined
    {
        this["_commands"].push(["drawIndexedIndirect", args]);
    }
}

class GPURenderBundleEncoderCommandCache extends GPURenderCommandsCache implements GPURenderBundleEncoder
{
    __brand: "GPURenderBundleEncoder" = "GPURenderBundleEncoder";
    _passEncoder: GPURenderBundleEncoder;
    constructor(passEncoder: GPURenderBundleEncoder)
    {
        super(passEncoder);
    }
    finish(descriptor?: GPURenderBundleDescriptor): GPURenderBundle
    {
        return this._passEncoder.finish(descriptor);
    }
}

class GPURenderPassEncoderCommandCache extends GPURenderCommandsCache implements GPURenderPassEncoder
{
    __brand: "GPURenderPassEncoder" = "GPURenderPassEncoder";
    _passEncoder: GPURenderPassEncoder;

    setViewport(x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number): undefined
    setViewport(...args: any): undefined
    {
        if (this.arrayEq0("setViewport", args)) return;

        this["_commands"].push(["setViewport", args]);
    }
    setScissorRect(x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate): undefined
    setScissorRect(...args: any): undefined
    {
        if (this.arrayEq0("setScissorRect", args)) return;

        this["_commands"].push(["setScissorRect", args]);
    }
    setBlendConstant(color: GPUColor): undefined
    {
        if (this.arrayEq0("setBlendConstant", [color])) return;
        this["_commands"].push(["setBlendConstant", [color]]);
    }
    setStencilReference(reference: GPUStencilValue): undefined
    {
        if (this.arrayEq0("setStencilReference", [reference])) return;

        this["_commands"].push(["setStencilReference", [reference]]);
    }

    beginOcclusionQuery(queryIndex: GPUSize32): undefined
    {
        this["_commands"].push(["beginOcclusionQuery", [queryIndex]]);
    }
    endOcclusionQuery(): undefined
    {
        this["_commands"].push(["endOcclusionQuery", []]);
    }
    executeBundles(bundles: Iterable<GPURenderBundle>): undefined
    {
        this["_commands"].push(["executeBundles", [bundles]]);
    }
    end(): undefined
    {
        this["_commands"].push(["end", []]);
    }
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