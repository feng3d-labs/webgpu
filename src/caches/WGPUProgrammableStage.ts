import { reactive } from "@feng3d/reactivity";
import { ComputeStage } from "../data/ComputeStage";
import { ReactiveObject } from "../ReactiveObject";
import { WGPUShaderModule } from "./WGPUShaderModule";

export class WGPUProgrammableStage extends ReactiveObject
{
    readonly gpuProgrammableStage: GPUProgrammableStage;

    constructor(device: GPUDevice, programmableStage: ComputeStage)
    {
        super();

        this._createGPUProgrammableStage(device, programmableStage);
        this._onMap(device, programmableStage);
    }

    private _createGPUProgrammableStage(device: GPUDevice, programmableStage: ComputeStage)
    {
        const r_this = reactive(this);
        const r_programmableStage = reactive(programmableStage);

        this.effect(() =>
        {
            r_programmableStage.code;
            r_programmableStage.entryPoint;
            r_programmableStage.constants;

            //
            const { code, entryPoint, constants } = programmableStage;
            const module = WGPUShaderModule.getGPUShaderModule(device, code);

            const gpuProgrammableStage: GPUProgrammableStage = {
                entryPoint,
                constants,
                module,
            };

            r_this.gpuProgrammableStage = gpuProgrammableStage;
        });
    }

    private _onMap(device: GPUDevice, programmableStage: ComputeStage)
    {
        device.programmableStages ??= new WeakMap<ComputeStage, WGPUProgrammableStage>();
        device.programmableStages.set(programmableStage, this);
        this.destroyCall(() => { device.programmableStages.delete(programmableStage); });
    }

    static getInstance(device: GPUDevice, programmableStage: ComputeStage)
    {
        return device.programmableStages?.get(programmableStage) || new WGPUProgrammableStage(device, programmableStage);
    }
}

declare global
{
    interface GPUDevice
    {
        programmableStages: WeakMap<ComputeStage, WGPUProgrammableStage>;
    }
}
