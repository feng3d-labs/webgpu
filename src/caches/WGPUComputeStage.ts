import { reactive } from "@feng3d/reactivity";
import { ComputeStage } from "../data/ComputeStage";
import { ReactiveObject } from "../ReactiveObject";
import { WGPUShaderModule } from "./WGPUShaderModule";
import { WgslReflectManager } from "./WgslReflectManager";

export class WGPUComputeStage extends ReactiveObject
{
    readonly gpuComputeStage: GPUProgrammableStage;

    constructor(device: GPUDevice, programmableStage: ComputeStage)
    {
        super();

        this._createGPUProgrammableStage(device, programmableStage);
        this._onMap(device, programmableStage);
    }

    private _createGPUProgrammableStage(device: GPUDevice, computeStage: ComputeStage)
    {
        const r_this = reactive(this);
        const r_programmableStage = reactive(computeStage);

        this.effect(() =>
        {
            r_programmableStage.code;
            r_programmableStage.entryPoint;
            r_programmableStage.constants;

            //
            const { code, constants } = computeStage;
            const module = WGPUShaderModule.getGPUShaderModule(device, code);

            //
            let entryPoint = computeStage.entryPoint;
            if (!entryPoint)
            {
                const reflect = WgslReflectManager.getWGSLReflectInfo(code);
                entryPoint = reflect.entry.compute[0].name;
            }

            const gpuProgrammableStage: GPUProgrammableStage = {
                entryPoint,
                constants,
                module,
            };

            r_this.gpuComputeStage = gpuProgrammableStage;
        });
    }

    private _onMap(device: GPUDevice, programmableStage: ComputeStage)
    {
        device.programmableStages ??= new WeakMap<ComputeStage, WGPUComputeStage>();
        device.programmableStages.set(programmableStage, this);
        this.destroyCall(() => { device.programmableStages.delete(programmableStage); });
    }

    static getInstance(device: GPUDevice, programmableStage: ComputeStage)
    {
        return device.programmableStages?.get(programmableStage) || new WGPUComputeStage(device, programmableStage);
    }
}

declare global
{
    interface GPUDevice
    {
        programmableStages: WeakMap<ComputeStage, WGPUComputeStage>;
    }
}
