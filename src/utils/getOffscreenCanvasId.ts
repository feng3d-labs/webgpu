
export function getOffscreenCanvasId(canvas: OffscreenCanvas)
{
    const id = canvas["id"] = canvas["id"] || ("OffscreenCanvas_" + OffscreenCanvasAutoId++);
    OffscreenCanvasMap[id] = canvas;
    return id;
}
let OffscreenCanvasAutoId = 0;

const OffscreenCanvasMap = {};

globalThis["document"] = globalThis["document"] || {} as any;
globalThis["document"].getElementById = globalThis["document"].getElementById || ((elementId: string) =>
{
    return OffscreenCanvasMap[elementId];
});