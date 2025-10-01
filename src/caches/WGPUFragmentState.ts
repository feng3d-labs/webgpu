import { reactive } from '@feng3d/reactivity';
import { FragmentState } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUColorTargetState } from './WGPUColorTargetState';
import { WGPUShaderModule } from './WGPUShaderModule';
import { WGPUShaderReflect } from './WGPUShaderReflect';

export class WGPUFragmentState extends ReactiveObject
{
    readonly gpuFragmentState: GPUFragmentState;

    constructor(device: GPUDevice, fragmentState: FragmentState, colorAttachments: readonly GPUTextureFormat[])
    {
        super();

        this._createGPUFragmentState(device, fragmentState, colorAttachments);
        this._onMap(device, fragmentState, colorAttachments);
    }

    private _createGPUFragmentState(device: GPUDevice, fragmentState: FragmentState, colorAttachments: readonly GPUTextureFormat[])
    {
        const r_this = reactive(this);
        const r_fragmentState = reactive(fragmentState);

        this.effect(() =>
        {
            r_fragmentState.code;
            r_fragmentState.entryPoint;
            r_fragmentState.targets;
            r_fragmentState.constants;

            const { code, targets, constants } = fragmentState;
            let entryPoint = fragmentState.entryPoint;

            const module = WGPUShaderModule.getGPUShaderModule(device, code);

            //
            if (!entryPoint)
            {
                const reflect = WGPUShaderReflect.getWGSLReflectInfo(code);
                entryPoint = reflect.entry.fragment[0].name;
            }

            const gpuColorTargetStates: GPUColorTargetState[] = colorAttachments.map((format) => ({ format }));

            if (targets)
            {
                gpuColorTargetStates.length = 0;

                for (let i = 0; i < colorAttachments.length; i++)
                {
                    const format = colorAttachments[i];
                    if (!format)
                    {
                        gpuColorTargetStates.push(undefined)
                        continue;
                    }
                    reactive(targets)[i];

                    const wgpuColorTargetState = WGPUColorTargetState.getInstance(targets[i], format);
                    reactive(wgpuColorTargetState).gpuColorTargetState;
                    const gpuColorTargetState = wgpuColorTargetState.gpuColorTargetState;

                    gpuColorTargetStates.push(gpuColorTargetState);
                }
            }

            const gpuFragmentState: GPUFragmentState = {
                module,
                entryPoint,
                targets: gpuColorTargetStates,
                constants,
            };

            r_this.gpuFragmentState = gpuFragmentState;
        });

        this.destroyCall(() => { r_this.gpuFragmentState = null; });
    }

    private _onMap(device: GPUDevice, fragmentState: FragmentState, colorAttachments: readonly GPUTextureFormat[])
    {
        device.fragmentStates ??= new WeakMap<FragmentState, Map<string, WGPUFragmentState>>();
        device.fragmentStates.set(fragmentState, device.fragmentStates.get(fragmentState) || new Map<string, WGPUFragmentState>());
        device.fragmentStates.get(fragmentState).set(colorAttachments.toString(), this);
        this.destroyCall(() => { device.fragmentStates.get(fragmentState).delete(colorAttachments.toString()); });
    }

    static getInstance(device: GPUDevice, fragmentState: FragmentState, colorAttachments: readonly GPUTextureFormat[])
    {
        if (!fragmentState) return undefined;

        return device.fragmentStates?.get(fragmentState)?.get(colorAttachments.toString()) || new WGPUFragmentState(device, fragmentState, colorAttachments);
    }

    static readonly cacheMap = new WeakMap<FragmentState, WGPUFragmentState>();
    static readonly defaultGPUFragmentState: GPUFragmentState = { module: undefined, entryPoint: undefined, targets: undefined, constants: undefined };
}

declare global
{
    interface GPUDevice
    {
        fragmentStates: WeakMap<FragmentState, Map<string, WGPUFragmentState>>;
    }
}