export function getOffscreenCanvasId(canvas: OffscreenCanvas)
{
    const id = canvas["id"] = canvas["id"] || (`OffscreenCanvas_${OffscreenCanvasAutoId++}`);
    OffscreenCanvasMap[id] = canvas;

    return id;
}
let OffscreenCanvasAutoId = 0;

const OffscreenCanvasMap = {};

if (!globalThis.document)
{
    globalThis.document = {} as any;
}
if (!globalThis.document.getElementById)
{
    globalThis.document.getElementById = (elementId: string) => OffscreenCanvasMap[elementId];
}