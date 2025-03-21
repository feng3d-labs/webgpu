import { ChainMap } from "@feng3d/render-api";

export const cache = new ChainMap();

export function setVaule<T extends Array<any>>(cache: ChainMap<any[], any>, keys: T): T
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

export class RenderObjectCache
{
    private commands: CommandType[] = [];
    push(command: CommandType)
    {
        this.commands.push(setVaule(cache, command));
    }

    delete(func: CommandType[0])
    {
        this.commands = this.commands.filter((c) => c[0] !== func);
    }

    setStencilReference?: [reference: GPUStencilValue];
    setBindGroup?: [index: number, bindGroup: GPUBindGroup][];
    setVertexBuffer?: [slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64][];
    setIndexBuffer?: [buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64];
    draw?: [vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32];
    drawIndexed?: [indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32];

    run(renderPass: GPURenderPassEncoder | GPURenderBundleEncoder)
    {
        this.commands.forEach((command) =>
        {
            const func = command[0];
            if (func === "setPipeline")
            {
                renderPass.setPipeline(command[1]);
            }
            else if (func === "setBindGroup")
            {
                renderPass.setBindGroup(command[1], command[2]);
            }
            else if (func === "setVertexBuffer")
            {
                renderPass.setVertexBuffer(command[1], command[2], command[3], command[4]);
            }
            else if (func === "setIndexBuffer")
            {
                renderPass.setIndexBuffer(command[1], command[2], command[3], command[4]);
            }
            else if (func === "draw")
            {
                renderPass.draw(command[1], command[2], command[3], command[4]);
            }
            else if (func === "drawIndexed")
            {
                renderPass.drawIndexed(command[1], command[2], command[3], command[4], command[5]);
            }
            else if (func === "setViewport")
            {
                if ("setViewport" in renderPass) renderPass.setViewport(command[1], command[2], command[3], command[4], command[5], command[6]);
            }
            else if (func === "setScissorRect")
            {
                if ("setScissorRect" in renderPass) renderPass.setScissorRect(command[1], command[2], command[3], command[4]);
            }
            else if (func === "setBlendConstant")
            {
                if ("setBlendConstant" in renderPass)
                    renderPass.setBlendConstant(command[1]);
            }
            else if (func === "setStencilReference")
            {
                if ("setStencilReference" in renderPass) renderPass.setStencilReference(command[1]);
            }
            else
            {
                func;
            }
        });
    }

    // static diff(a: RenderObjectCache, b: RenderObjectCache)
    // {
    //     if (!a) return b;

    //     const result: RenderObjectCache = {} as any;

    //     if (a.setViewport !== b.setViewport && b.setViewport && (a.setViewport[0] !== b.setViewport[0] || a.setViewport[1] !== b.setViewport[1] || a.setViewport[2] !== b.setViewport[2] || a.setViewport[3] !== b.setViewport[3] || a.setViewport[4] !== b.setViewport[4] || a.setViewport[5] !== b.setViewport[5]))
    //     {
    //         result.setViewport = b.setViewport;
    //     }
    //     if (b.setScissorRect && (!a.setScissorRect || b.setScissorRect.some((v, i) => v !== a.setScissorRect[i])))
    //     {
    //         result.setScissorRect = b.setScissorRect;
    //     }
    //     if (b.setPipeline && (!a.setPipeline || b.setPipeline.some((v, i) => v !== a.setPipeline[i])))
    //     {
    //         result.setPipeline = b.setPipeline;
    //     }
    //     if (b.setBlendConstant && (!a.setBlendConstant || b.setBlendConstant.some((v, i) => v !== a.setBlendConstant[i])))
    //     {
    //         result.setBlendConstant = b.setBlendConstant;
    //     }
    //     if (b.setStencilReference && (!a.setStencilReference || b.setStencilReference.some((v, i) => v !== a.setStencilReference[i])))
    //     {
    //         result.setStencilReference = b.setStencilReference;
    //     }
    //     result.setBindGroup = [];
    //     if (b.setBindGroup)
    //     {
    //         if (!a.setBindGroup)
    //         {
    //             result.setBindGroup = b.setBindGroup;
    //         }
    //         else
    //         {
    //             for (let i = 0, len = b.setBindGroup.length; i < len; i++)
    //             {
    //                 if (!a.setBindGroup[i] || b.setBindGroup[i].some((v, i) => v !== a.setBindGroup[i][i]))
    //                 {
    //                     result.setBindGroup.push(b.setBindGroup[i]);
    //                 }
    //             }
    //         }
    //     }
    //     result.setVertexBuffer = [];
    //     if (b.setVertexBuffer)
    //     {
    //         if (!a.setVertexBuffer)
    //         {
    //             result.setVertexBuffer = b.setVertexBuffer;
    //         }
    //         else
    //         {
    //             for (let i = 0, len = b.setVertexBuffer.length; i < len; i++)
    //             {
    //                 if (!a.setVertexBuffer[i] || b.setVertexBuffer[i].some((v, j) => v !== a.setVertexBuffer[i][j]))
    //                 {
    //                     result.setVertexBuffer.push(b.setVertexBuffer[i]);
    //                 }
    //             }
    //         }
    //     }
    //     if (b.setIndexBuffer && (!a.setIndexBuffer || b.setIndexBuffer.some((v, i) => v !== a.setIndexBuffer[i])))
    //     {
    //         result.setIndexBuffer = b.setIndexBuffer;
    //     }
    //     if (b.draw && (!a.draw || b.draw.some((v, i) => v !== a.draw[i])))
    //     {
    //         result.draw = b.draw;
    //     }
    //     if (b.drawIndexed && (!a.drawIndexed || b.drawIndexed.some((v, i) => v !== a.drawIndexed[i])))
    //     {
    //         result.drawIndexed = b.drawIndexed;
    //     }

    //     return result;
    // }
}