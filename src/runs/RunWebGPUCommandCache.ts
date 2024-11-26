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
    __brand: "GPURenderPassEncoder";
    label: string;

    private _passEncoder: GPURenderPassEncoder;

    constructor(passEncoder: GPURenderPassEncoder)
    {
        this._passEncoder = passEncoder;
    }

    setViewport(x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number): undefined
    {
        return this._passEncoder.setViewport(x, y, width, height, minDepth, maxDepth);
    }
    setScissorRect(x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate): undefined
    {
        return this._passEncoder.setScissorRect(x, y, width, height);
    }
    setBlendConstant(color: GPUColor): undefined
    {
        return this._passEncoder.setBlendConstant(color)
    }
    setStencilReference(reference: GPUStencilValue): undefined
    {
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
    setBindGroup(index: GPUIndex32, bindGroup: GPUBindGroup | null, dynamicOffsetsData?: unknown, dynamicOffsetsDataStart?: unknown, dynamicOffsetsDataLength?: unknown): undefined
    setBindGroup(...args: any): undefined
    {
        return this._passEncoder.setBindGroup.apply(this._passEncoder, args);
    }
    setPipeline(pipeline: GPURenderPipeline): undefined
    {
        return this._passEncoder.setPipeline(pipeline);
    }
    setIndexBuffer(buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64): undefined
    {
        return this._passEncoder.setIndexBuffer(buffer, indexFormat, offset, size);
    }
    setVertexBuffer(slot: GPUIndex32, buffer: GPUBuffer | null, offset?: GPUSize64, size?: GPUSize64): undefined
    {
        return this._passEncoder.setVertexBuffer(slot, buffer, offset, size);
    }
    draw(vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32): undefined
    {
        return this._passEncoder.draw(vertexCount, instanceCount, firstVertex, firstInstance);
    }
    drawIndexed(indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32): undefined
    {
        return this._passEncoder.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance)
    }
    drawIndirect(indirectBuffer: GPUBuffer, indirectOffset: GPUSize64): undefined
    {
        return this._passEncoder.drawIndirect(indirectBuffer, indirectOffset);
    }
    drawIndexedIndirect(indirectBuffer: GPUBuffer, indirectOffset: GPUSize64): undefined
    {
        return this._passEncoder.drawIndexedIndirect(indirectBuffer, indirectOffset);
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