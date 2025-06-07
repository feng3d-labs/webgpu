import { CommandType, RenderObjectCache, RenderPassObjectCommand } from './RenderObjectCache';

export class OcclusionQueryCache implements RenderPassObjectCommand
{
    queryIndex: number;
    renderObjectCaches: RenderObjectCache[];

    run(device: GPUDevice, commands: CommandType[], state: RenderObjectCache)
    {
        commands.push(['beginOcclusionQuery', this.queryIndex]);
        for (let i = 0, len = this.renderObjectCaches.length; i < len; i++)
        {
            this.renderObjectCaches[i].run(undefined, commands, state);
        }
        commands.push(['endOcclusionQuery']);
    }
}
