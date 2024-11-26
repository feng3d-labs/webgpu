import { IGPUComputeObject } from "../data/IGPUComputeObject";
import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPassObject } from "../data/IGPURenderPass";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { RunWebGPUStateCache } from "./RunWebGPUStateCache";

export class RunWebGPUCommandCache1 extends RunWebGPUStateCache
{
    protected runComputeObjects(device: GPUDevice, passEncoder: GPUComputePassEncoder, computeObjects: IGPUComputeObject[])
    {
        cacheComputePassEncoder(passEncoder);
        super.runComputeObjects(device, passEncoder, computeObjects);
    }

    protected runRenderPassObjects(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormats: IGPURenderPassFormat, renderObjects?: IGPURenderPassObject[])
    {
        cacheRenderPassEncoder(passEncoder);
        super.runRenderPassObjects(device, passEncoder, renderPassFormats, renderObjects);
    }

    protected runRenderBundleObjects(device: GPUDevice, bundleEncoder: GPURenderBundleEncoder, renderPassFormats: IGPURenderPassFormat, renderObjects?: IGPURenderObject[])
    {
        cacheRenderBundleEncoder(bundleEncoder);
        super.runRenderBundleObjects(device, bundleEncoder, renderPassFormats, renderObjects);
    }
}

function cacheComputePassEncoder(passEncoder: GPUComputePassEncoder)
{
    passEncoder[CacheName] = { setBindGroup: [], setVertexBuffer: [] };

    apply(passEncoder, "setBindGroup", arrayEq1);
    apply(passEncoder, "setPipeline", valueEq);
}

function cacheRenderPassEncoder(passEncoder: GPURenderPassEncoder)
{
    passEncoder[CacheName] = { setBindGroup: [], setVertexBuffer: [] };

    apply(passEncoder, "setBindGroup", arrayEq1);
    apply(passEncoder, "setPipeline", valueEq);
    apply(passEncoder, "setIndexBuffer", arrayEq0);
    apply(passEncoder, "setVertexBuffer", arrayEq1);
    //
    apply(passEncoder, "setViewport", arrayEq0);
    apply(passEncoder, "setScissorRect", arrayEq0);
    apply(passEncoder, "setBlendConstant", valueEq);
    apply(passEncoder, "setStencilReference", valueEq);
}

function cacheRenderBundleEncoder(passEncoder: GPURenderBundleEncoder)
{
    passEncoder[CacheName] = { setBindGroup: [], setVertexBuffer: [] };

    apply(passEncoder, "setBindGroup", arrayEq1);
    apply(passEncoder, "setPipeline", valueEq);
    apply(passEncoder, "setIndexBuffer", arrayEq0);
    apply(passEncoder, "setVertexBuffer", arrayEq1);
}

type TypePropertyNames<T, KT> = { [K in keyof T]: T[K] extends KT ? K : never }[keyof T];
type FunctionPropertyNames<T> = TypePropertyNames<T, Function>;

const CacheName = "_obj";

function apply<T, K extends FunctionPropertyNames<T>>(object: T, funcName: K, call: (_obj: any, name: string, args: any[]) => boolean)
{
    object[funcName] = ((oldFunc: Function) =>
    {
        return function (...args: any[])
        {
            if (call(object[CacheName], funcName as any, args)) return;

            return oldFunc.apply(this, args);
        };
    })(object[funcName] as Function) as any;
}

function valueEq(_obj: any, name: string, args: any)
{
    if (_obj[name] === args[0])
    {
        return true;
    }
    _obj[name] = args[0];
    return false;
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

function arrayEq1(_obj: any, name: string, args: any[])
{
    const obj = _obj[name];
    const index: number = args[0];
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
