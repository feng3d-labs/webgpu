import { IGPUComputeObject } from "../data/IGPUComputeObject";
import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPassObject } from "../data/IGPURenderPass";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { ChainMap } from "../utils/ChainMap";
import { RunWebGPUStateCache } from "./RunWebGPUStateCache";

/**
 * 套壳模式（RunWebGPUCommandCache）优于覆盖函数(RunWebGPUCommandCache1)的形式。
 */
export class RunWebGPUCommandCache extends RunWebGPUStateCache
{
    protected runComputeObjects(device: GPUDevice, passEncoder: GPUComputePassEncoder, computeObjects: IGPUComputeObject[])
    {
        passEncoder = new GPUComputePassEncoderCommandCache(passEncoder);
        super.runComputeObjects(device, passEncoder, computeObjects);
    }

    protected runRenderPassObjects(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormats: IGPURenderPassFormat, renderObjects?: IGPURenderPassObject[])
    {
        passEncoder = new GPURenderPassEncoderCommandCache(passEncoder);
        super.runRenderPassObjects(device, passEncoder, renderPassFormats, renderObjects);
    }

    protected runRenderBundleObjects(device: GPUDevice, bundleEncoder: GPURenderBundleEncoder, renderPassFormats: IGPURenderPassFormat, renderObjects?: IGPURenderObject[])
    {
        bundleEncoder = new GPURenderBundleEncoderCommandCache(bundleEncoder);
        super.runRenderBundleObjects(device, bundleEncoder, renderPassFormats, renderObjects);
    }

    protected runComputeObject(device: GPUDevice, passEncoder: GPUComputePassEncoder, computeObject: IGPUComputeObject)
    {
        const map: Map<IGPUComputeObject, Array<any>> = device["_IGPUComputeObjectCommandMap"] = device["_IGPUComputeObjectCommandMap"] || new Map();
        let commands = map.get(computeObject);
        if (commands)
        {
            let _passEncoder = (passEncoder as GPUComputePassEncoderCommandCache)._passEncoder;
            commands.forEach((v) =>
            {
                _passEncoder[v[0]].apply(_passEncoder, v[1]);
            });

            return;
        }
        passEncoder["_commands"] = commands = [];

        map.set(computeObject, commands);

        super.runComputeObject(device, passEncoder, computeObject);

        passEncoder["_commands"] = undefined;
    }

    protected runRenderObject(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPassFormat: IGPURenderPassFormat, renderObject: IGPURenderObject)
    {
        const map: ChainMap<[IGPURenderPassFormat, IGPURenderObject], Array<any>> = device["_IGPURenderObjectCommandMap"] = device["_IGPURenderObjectCommandMap"] || new ChainMap();
        let commands = map.get([renderPassFormat, renderObject]);
        if (commands)
        {
            let _passEncoder = (passEncoder as GPURenderPassEncoderCommandCache)._passEncoder;
            commands.forEach((v) =>
            {
                _passEncoder[v[0]].apply(_passEncoder, v[1]);
            });

            return;
        }
        passEncoder["_commands"] = commands = [];

        map.set([renderPassFormat, renderObject], commands);

        super.runRenderObject(device, passEncoder, renderPassFormat, renderObject);

        passEncoder["_commands"] = undefined;
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

        return this._passEncoder.setBindGroup.apply(this._passEncoder, args);
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

    protected valueEq(name: string, value: any)
    {
        if (this._obj[name] === value)
        {
            return true;
        }
        this._obj[name] = value;
        return false;
    }

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
        if (this.valueEq("setPipeline", pipeline)) return;

        this["_commands"].push(["setPipeline", [pipeline]]);

        return this._passEncoder.setPipeline(pipeline);
    }
    setIndexBuffer(buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64): undefined
    setIndexBuffer(...args: any): undefined
    {
        if (this.arrayEq0("setIndexBuffer", args)) return;

        this["_commands"].push(["setIndexBuffer", args]);

        return this._passEncoder.setIndexBuffer.apply(this._passEncoder, args);
    }
    setVertexBuffer(slot: GPUIndex32, buffer: GPUBuffer | null, offset?: GPUSize64, size?: GPUSize64): undefined
    setVertexBuffer(...args: any): undefined
    {
        if (this.arrayEq1("setVertexBuffer", args[0], args)) return;

        this["_commands"].push(["setVertexBuffer", args]);

        return this._passEncoder.setVertexBuffer.apply(this._passEncoder, args);
    }
    draw(vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32): undefined
    draw(...args: any): undefined
    {
        this["_commands"].push(["draw", args]);

        return this._passEncoder.draw.apply(this._passEncoder, args);
    }

    drawIndexed(indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32): undefined
    drawIndexed(...args: any): undefined
    {
        this["_commands"].push(["drawIndexed", args]);

        return this._passEncoder.drawIndexed.apply(this._passEncoder, args);
    }
    drawIndirect(indirectBuffer: GPUBuffer, indirectOffset: GPUSize64): undefined
    drawIndirect(...args: any): undefined
    {
        return this._passEncoder.drawIndirect.apply(this._passEncoder, args);
    }
    drawIndexedIndirect(indirectBuffer: GPUBuffer, indirectOffset: GPUSize64): undefined
    drawIndexedIndirect(...args: any): undefined
    {
        return this._passEncoder.drawIndexedIndirect.apply(this._passEncoder, args);
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

        return this._passEncoder.setViewport.apply(this._passEncoder, args);
    }
    setScissorRect(x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate): undefined
    setScissorRect(...args: any): undefined
    {
        if (this.arrayEq0("setScissorRect", args)) return;

        return this._passEncoder.setViewport.apply(this._passEncoder, args);
    }
    setBlendConstant(color: GPUColor): undefined
    {
        if (this.valueEq("setBlendConstant", color)) return;

        return this._passEncoder.setBlendConstant(color)
    }
    setStencilReference(reference: GPUStencilValue): undefined
    {
        if (this.valueEq("setStencilReference", reference)) return;

        return this._passEncoder.setStencilReference(reference);
    }

    beginOcclusionQuery(queryIndex: GPUSize32): undefined
    {
        return this._passEncoder.beginOcclusionQuery(queryIndex);
    }
    endOcclusionQuery(): undefined
    {
        return this._passEncoder.endOcclusionQuery();
    }
    executeBundles(bundles: Iterable<GPURenderBundle>): undefined
    {
        return this._passEncoder.executeBundles(bundles);
    }
    end(): undefined
    {
        return this._passEncoder.end();
    }
}

class GPUComputePassEncoderCommandCache extends GPUPassEncoderCommandCache implements GPUComputePassEncoder
{
    __brand: "GPUComputePassEncoder" = "GPUComputePassEncoder";
    _passEncoder: GPUComputePassEncoder;

    setPipeline(pipeline: GPUComputePipeline): undefined
    setPipeline(...args: any): undefined
    {
        if (this.valueEq("setPipeline", args[0])) return;

        this["_commands"].push(["setPipeline", args]);

        return this._passEncoder.setPipeline.apply(this._passEncoder, args);
    }
    dispatchWorkgroups(workgroupCountX: GPUSize32, workgroupCountY?: GPUSize32, workgroupCountZ?: GPUSize32): undefined
    dispatchWorkgroups(...args: any): undefined
    {
        this["_commands"].push(["dispatchWorkgroups", args]);

        return this._passEncoder.dispatchWorkgroups.apply(this._passEncoder, args);
    }
    dispatchWorkgroupsIndirect(indirectBuffer: GPUBuffer, indirectOffset: GPUSize64): undefined
    dispatchWorkgroupsIndirect(...args: any): undefined
    {
        this["_commands"].push(["dispatchWorkgroupsIndirect", args]);

        return this._passEncoder.dispatchWorkgroupsIndirect.apply(this._passEncoder, args);
    }
    end(): undefined
    {
        return this._passEncoder.end();
    }
}