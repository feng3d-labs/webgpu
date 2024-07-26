import { IRenderObject, IRenderPass, WebGPU } from "webgpu-renderer";
import redFragWGSL from "../../shaders/red.frag.wgsl";
import triangleVertWGSL from "../../shaders/triangle.vert.wgsl";

const init = async (canvas: HTMLCanvasElement) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await WebGPU.init();

    const renderPass: IRenderPass = {
        colorAttachments: [{
            view: { texture: { context: { canvasId: canvas.id } } },
            clearValue: [0.0, 0.0, 0.0, 1.0],
        }],
    };

    const renderObject: IRenderObject = {
        pipeline: {
            vertex: { code: triangleVertWGSL }, fragment: { code: redFragWGSL },
        },
        draw: { vertexCount: 3 },
    };

    function frame()
    {
        webgpu.renderPass(renderPass);
        webgpu.renderObject(renderObject);

        webgpu.submit();

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas);
