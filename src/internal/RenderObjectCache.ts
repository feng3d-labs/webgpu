import { ChainMap, OcclusionQuery, RenderPass } from "@feng3d/render-api";
import { GPURenderOcclusionQuery } from "../caches/getGPURenderOcclusionQuery";

const cache = new ChainMap();

function setVaule<T extends Array<any>>(cache: ChainMap<any[], any>, keys: T): T
{
    const v = cache.get(keys);
    if (v) return v;
    cache.set(keys, keys);
    return keys;
}

type CommandType =
    | [func: "setViewport", x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number]
    | [func: "setScissorRect", x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate]
    | [func: "setPipeline", pipeline: GPURenderPipeline]
    | [func: "setBindGroup", index: number, bindGroup: GPUBindGroup]
    | [func: "setVertexBuffer", slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64]
    | [func: "setIndexBuffer", buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64]
    | [func: "draw", vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32]
    | [func: "drawIndexed", indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32]
    | [func: "setBlendConstant", color: GPUColor]
    | [func: "setStencilReference", reference: GPUStencilValue]
    ;

export class RenderObjectCache implements RenderPassObjectCommand
{
    protected setViewport?: [func: "setViewport", x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number];
    protected setScissorRect?: [func: "setScissorRect", x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate];
    protected setPipeline: [func: "setPipeline", pipeline: GPURenderPipeline];
    protected setBlendConstant?: [func: "setBlendConstant", color: GPUColor];
    protected setStencilReference?: [func: "setStencilReference", reference: GPUStencilValue];
    protected setBindGroup?: [func: "setBindGroup", index: number, bindGroup: GPUBindGroup][];
    protected setVertexBuffer?: [func: "setVertexBuffer", slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64][];
    protected setIndexBuffer?: [func: "setIndexBuffer", buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64];
    protected draw?: [func: "draw", vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32];
    protected drawIndexed?: [func: "drawIndexed", indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32];

    // private commands: CommandType[] = [];
    push(command: CommandType)
    {
        const func = command[0];
        if (func === "setBindGroup")
        {
            if (!this.setBindGroup) this.setBindGroup = [];
            this.setBindGroup.push(command);
            return;
        }
        else if (func === "setVertexBuffer")
        {
            if (!this.setVertexBuffer) this.setVertexBuffer = [];
            this.setVertexBuffer.push(command);
            return;
        }
        command = setVaule(cache, command);
        this[command[0]] = command as any;
    }

    delete(func: CommandType[0])
    {
        if (func === "setBindGroup")
        {
            this.setBindGroup = [];
            return;
        }
        else if (func === "setVertexBuffer")
        {
            this.setVertexBuffer = [];
            return;
        }
        this[func as any] = undefined;
    }

    run(renderPass: GPURenderPassEncoder | GPURenderBundleEncoder, state?: RenderObjectCache)
    {
        // this.commands.forEach((command) =>
        // {
        //     const func = command[0];
        //     if (func === "setPipeline")
        //     {
        //         renderPass.setPipeline(command[1]);
        //     }
        //     else if (func === "setBindGroup")
        //     {
        //         renderPass.setBindGroup(command[1], command[2]);
        //     }
        //     else if (func === "setVertexBuffer")
        //     {
        //         renderPass.setVertexBuffer(command[1], command[2], command[3], command[4]);
        //     }
        //     else if (func === "setIndexBuffer")
        //     {
        //         renderPass.setIndexBuffer(command[1], command[2], command[3], command[4]);
        //     }
        //     else if (func === "draw")
        //     {
        //         renderPass.draw(command[1], command[2], command[3], command[4]);
        //     }
        //     else if (func === "drawIndexed")
        //     {
        //         renderPass.drawIndexed(command[1], command[2], command[3], command[4], command[5]);
        //     }
        //     else if (func === "setViewport")
        //     {
        //         if ("setViewport" in renderPass) renderPass.setViewport(command[1], command[2], command[3], command[4], command[5], command[6]);
        //     }
        //     else if (func === "setScissorRect")
        //     {
        //         if ("setScissorRect" in renderPass) renderPass.setScissorRect(command[1], command[2], command[3], command[4]);
        //     }
        //     else if (func === "setBlendConstant")
        //     {
        //         if ("setBlendConstant" in renderPass)
        //             renderPass.setBlendConstant(command[1]);
        //     }
        //     else if (func === "setStencilReference")
        //     {
        //         if ("setStencilReference" in renderPass) renderPass.setStencilReference(command[1]);
        //     }
        //     else
        //     {
        //         func;
        //     }
        // });

        const { setViewport, setScissorRect, setPipeline, setBlendConstant, setStencilReference, setBindGroup, setVertexBuffer, setIndexBuffer, draw, drawIndexed } = this;

        if (setViewport && "setViewport" in renderPass)
        {
            if (!state || state.setViewport !== setViewport) renderPass.setViewport(setViewport[1], setViewport[2], setViewport[3], setViewport[4], setViewport[5], setViewport[6]);
            if (state) state.setViewport = setViewport;
        }
        if (setScissorRect && "setScissorRect" in renderPass)
        {
            if (!state || state.setScissorRect !== setScissorRect) renderPass.setScissorRect(setScissorRect[1], setScissorRect[2], setScissorRect[3], setScissorRect[4]);
            if (state) state.setScissorRect = setScissorRect;
        }
        if (!state || state.setPipeline !== setPipeline) renderPass.setPipeline(setPipeline[1]);
        if (state) state.setPipeline = setPipeline;
        if (setBlendConstant && "setBlendConstant" in renderPass)
        {
            if (!state || state.setBlendConstant !== setBlendConstant) renderPass.setBlendConstant(setBlendConstant[1]);
            if (state) state.setBlendConstant = setBlendConstant;
        }
        if (setStencilReference && "setStencilReference" in renderPass)
        {
            if (!state || state.setStencilReference !== setStencilReference) renderPass.setStencilReference(setStencilReference[1]);
            if (state) state.setStencilReference = setStencilReference;
        }
        if (setBindGroup)
        {
            if (state) state.setBindGroup ??= [];
            for (let i = 0, len = setBindGroup.length; i < len; i++)
            {
                if (!state || !state.setBindGroup[i] || state.setBindGroup[i] !== setBindGroup[i]) renderPass.setBindGroup(setBindGroup[i][1], setBindGroup[i][2]);
                if (state) state.setBindGroup[i] = setBindGroup[i];
            }
        }
        if (setVertexBuffer)
        {
            if (state) state.setVertexBuffer ??= [];
            for (let i = 0, len = setVertexBuffer.length; i < len; i++)
            {
                if (!state || !state.setVertexBuffer[i] || state.setVertexBuffer[i] !== setVertexBuffer[i]) renderPass.setVertexBuffer(setVertexBuffer[i][1], setVertexBuffer[i][2], setVertexBuffer[i][3], setVertexBuffer[i][4]);
                if (state) state.setVertexBuffer[i] = setVertexBuffer[i];
            }
        }
        if (setIndexBuffer)
        {
            if (!state || state.setIndexBuffer !== setIndexBuffer) renderPass.setIndexBuffer(setIndexBuffer[1], setIndexBuffer[2], setIndexBuffer[3]);
            if (state) state.setIndexBuffer = setIndexBuffer;
        }
        if (draw)
        {
            renderPass.draw(draw[1], draw[2], draw[3], draw[4]);
        }
        if (drawIndexed)
        {
            renderPass.drawIndexed(drawIndexed[1], drawIndexed[2], drawIndexed[3], drawIndexed[4], drawIndexed[5]);
        }
    }

    static diff(a: RenderObjectCache, b: RenderObjectCache)
    {
        if (!a) return b;

        const result: RenderObjectCache = {} as any;

        if (a.setViewport !== b.setViewport && b.setViewport && (a.setViewport[0] !== b.setViewport[0] || a.setViewport[1] !== b.setViewport[1] || a.setViewport[2] !== b.setViewport[2] || a.setViewport[3] !== b.setViewport[3] || a.setViewport[4] !== b.setViewport[4] || a.setViewport[5] !== b.setViewport[5]))
        {
            result.setViewport = b.setViewport;
        }
        if (b.setScissorRect && (!a.setScissorRect || b.setScissorRect.some((v, i) => v !== a.setScissorRect[i])))
        {
            result.setScissorRect = b.setScissorRect;
        }
        if (b.setPipeline && (!a.setPipeline || b.setPipeline.some((v, i) => v !== a.setPipeline[i])))
        {
            result.setPipeline = b.setPipeline;
        }
        if (b.setBlendConstant && (!a.setBlendConstant || b.setBlendConstant.some((v, i) => v !== a.setBlendConstant[i])))
        {
            result.setBlendConstant = b.setBlendConstant;
        }
        if (b.setStencilReference && (!a.setStencilReference || b.setStencilReference.some((v, i) => v !== a.setStencilReference[i])))
        {
            result.setStencilReference = b.setStencilReference;
        }
        result.setBindGroup = [];
        if (b.setBindGroup)
        {
            if (!a.setBindGroup)
            {
                result.setBindGroup = b.setBindGroup;
            }
            else
            {
                for (let i = 0, len = b.setBindGroup.length; i < len; i++)
                {
                    if (!a.setBindGroup[i] || b.setBindGroup[i].some((v, i) => v !== a.setBindGroup[i][i]))
                    {
                        result.setBindGroup.push(b.setBindGroup[i]);
                    }
                }
            }
        }
        result.setVertexBuffer = [];
        if (b.setVertexBuffer)
        {
            if (!a.setVertexBuffer)
            {
                result.setVertexBuffer = b.setVertexBuffer;
            }
            else
            {
                for (let i = 0, len = b.setVertexBuffer.length; i < len; i++)
                {
                    if (!a.setVertexBuffer[i] || b.setVertexBuffer[i].some((v, j) => v !== a.setVertexBuffer[i][j]))
                    {
                        result.setVertexBuffer.push(b.setVertexBuffer[i]);
                    }
                }
            }
        }
        if (b.setIndexBuffer && (!a.setIndexBuffer || b.setIndexBuffer.some((v, i) => v !== a.setIndexBuffer[i])))
        {
            result.setIndexBuffer = b.setIndexBuffer;
        }
        if (b.draw && (!a.draw || b.draw.some((v, i) => v !== a.draw[i])))
        {
            result.draw = b.draw;
        }
        if (b.drawIndexed && (!a.drawIndexed || b.drawIndexed.some((v, i) => v !== a.drawIndexed[i])))
        {
            result.drawIndexed = b.drawIndexed;
        }

        return result;
    }
}

export class OcclusionQueryCache implements RenderPassObjectCommand
{
    queryIndex: number;
    renderObjectCaches: RenderObjectCache[];

    run(passEncoder: GPURenderPassEncoder)
    {
        passEncoder.beginOcclusionQuery(this.queryIndex);
        for (let i = 0, len = this.renderObjectCaches.length; i < len; i++)
        {
            this.renderObjectCaches[i].run(passEncoder);
        }
        passEncoder.endOcclusionQuery();
    }
}

export interface RenderPassObjectCommand
{
    run(passEncoder: GPURenderPassEncoder): void;
}

export class RenderBundleCommand implements RenderPassObjectCommand
{
    gpuRenderBundle: GPURenderBundle;
    descriptor: GPURenderBundleEncoderDescriptor;
    renderObjectCaches: RenderObjectCache[];
    run(passEncoder: GPURenderPassEncoder): void
    {
        if (!this.gpuRenderBundle)
        {
            //
            const renderBundleEncoder = passEncoder.device.createRenderBundleEncoder(this.descriptor);
            //
            this.renderObjectCaches.forEach((renderObjectCache) =>
            {
                renderObjectCache.run(renderBundleEncoder);
            });

            this.gpuRenderBundle = renderBundleEncoder.finish();
        }

        passEncoder.executeBundles([this.gpuRenderBundle]);
    }
}

export class RenderPassCommand
{
    run(commandEncoder: GPUCommandEncoder)
    {
        const { renderPassDescriptor, renderPassObjects, occlusionQuerys, renderPass } = this;
        const { device } = commandEncoder;

        // 处理不被遮挡查询。
        const occlusionQuery = new GPURenderOcclusionQuery();
        occlusionQuery.init(device, renderPassDescriptor, occlusionQuerys);

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.device = device;
        renderPassObjects.forEach((command) =>
        {
            command.run(passEncoder);
        });
        passEncoder.end();

        // 处理不被遮挡查询。
        occlusionQuery.resolve(commandEncoder, renderPass);

        renderPassDescriptor.timestampWrites?.resolve(commandEncoder);
    }
    renderPass: RenderPass;
    renderPassDescriptor: GPURenderPassDescriptor;
    renderPassObjects: RenderPassObjectCommand[];
    occlusionQuerys: OcclusionQuery[];
    occlusionQuery: GPURenderOcclusionQuery;
}

export class ComputeObjectCommand
{
    run(passEncoder: GPUComputePassEncoder)
    {
        passEncoder.setPipeline(this.computePipeline);
        this.setBindGroup.forEach(([index, bindGroup]) =>
        {
            passEncoder.setBindGroup(index, bindGroup);
        });
        const [workgroupCountX, workgroupCountY, workgroupCountZ] = this.dispatchWorkgroups;
        passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
    }
    computePipeline: GPUComputePipeline;
    setBindGroup: [index: GPUIndex32, bindGroup: GPUBindGroup][];
    dispatchWorkgroups: [workgroupCountX: GPUSize32, workgroupCountY?: GPUSize32, workgroupCountZ?: GPUSize32];
}