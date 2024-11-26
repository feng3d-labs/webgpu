import { IGPUComputeObject } from "../data/IGPUComputeObject";
import { IGPURenderPassObject } from "../data/IGPURenderPass";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { RunWebGPUStateCache } from "./RunWebGPUStateCache";

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
}

class GPURenderPassEncoderCommandCache implements GPURenderPassEncoder
{
    constructor(passEncoder: GPURenderPassEncoder)
    {
        this._passEncoder = passEncoder;
    }

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

    setBindGroup(index: GPUIndex32, bindGroup: GPUBindGroup | null, dynamicOffsets?: Iterable<GPUBufferDynamicOffset>): undefined;
    setBindGroup(index: GPUIndex32, bindGroup: GPUBindGroup | null, dynamicOffsetsData: Uint32Array, dynamicOffsetsDataStart: GPUSize64, dynamicOffsetsDataLength: GPUSize32): undefined;
    setBindGroup(...args: any): undefined
    {
        if (this.arrayEq1("setBindGroup", args[0], args)) return;

        return this._passEncoder.setBindGroup.apply(this._passEncoder, args);
    }
    setPipeline(pipeline: GPURenderPipeline): undefined
    {
        if (this.valueEq("setPipeline", pipeline)) return;

        return this._passEncoder.setPipeline(pipeline);
    }
    setIndexBuffer(buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64): undefined
    setIndexBuffer(...args: any): undefined
    {
        if (this.arrayEq0("setIndexBuffer", args)) return;

        return this._passEncoder.setIndexBuffer.apply(this._passEncoder, args);
    }
    setVertexBuffer(slot: GPUIndex32, buffer: GPUBuffer | null, offset?: GPUSize64, size?: GPUSize64): undefined
    setVertexBuffer(...args: any): undefined
    {
        if (this.arrayEq1("setVertexBuffer", args[0], args)) return;

        return this._passEncoder.setVertexBuffer.apply(this._passEncoder, args);
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

    draw(vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32): undefined
    draw(...args: any): undefined
    {
        return this._passEncoder.draw.apply(this._passEncoder, args);
    }
    drawIndexed(indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32): undefined
    drawIndexed(...args: any): undefined
    {
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

    __brand: "GPURenderPassEncoder";
    label: string;

    private _passEncoder: GPURenderPassEncoder;
    private _obj = { setBindGroup: [], setVertexBuffer: [] };

    private valueEq(name: string, value: any)
    {
        if (this._obj[name] === value)
        {
            return true;
        }
        this._obj[name] = value;
        return false;
    }

    private arrayEq0(name: string, args: any[])
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

    private arrayEq1(name: string, index: number, args: any[])
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

class GPUComputePassEncoderCommandCache implements GPUComputePassEncoder
{
    __brand: "GPUComputePassEncoder";
    label: string;
    private _passEncoder: GPUComputePassEncoder;

    constructor(passEncoder: GPUComputePassEncoder)
    {
        this._passEncoder = passEncoder;
    }

    setPipeline(pipeline: GPUComputePipeline): undefined
    {
        throw new Error("Method not implemented.");
    }
    dispatchWorkgroups(workgroupCountX: GPUSize32, workgroupCountY?: GPUSize32, workgroupCountZ?: GPUSize32): undefined
    {
        throw new Error("Method not implemented.");
    }
    dispatchWorkgroupsIndirect(indirectBuffer: GPUBuffer, indirectOffset: GPUSize64): undefined
    {
        throw new Error("Method not implemented.");
    }
    end(): undefined
    {
        throw new Error("Method not implemented.");
    }
    pushDebugGroup(groupLabel: string): undefined
    {
        throw new Error("Method not implemented.");
    }
    popDebugGroup(): undefined
    {
        throw new Error("Method not implemented.");
    }
    insertDebugMarker(markerLabel: string): undefined
    {
        throw new Error("Method not implemented.");
    }
    setBindGroup(index: unknown, bindGroup: unknown, dynamicOffsetsData?: unknown, dynamicOffsetsDataStart?: unknown, dynamicOffsetsDataLength?: unknown): undefined
    {
        throw new Error("Method not implemented.");
    }
}