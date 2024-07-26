import redFragWGSL from "../../shaders/red.frag.wgsl";
import triangleVertWGSL from "../../shaders/triangle.vert.wgsl";

import { IRenderObject, IRenderPass, WebGPU } from "webgpu-renderer";
import styles from "./animatedCanvasSize.module.css";

const init = async (canvas: HTMLCanvasElement) =>
{
    const webgpu = await WebGPU.init();

    const renderPass: IRenderPass = {
        colorAttachments: [{
            view: { texture: { context: { canvasId: canvas.id } } },
            clearValue: [0.0, 0.0, 0.0, 1.0],
        }],
        multisample: 4, // 设置多重采样数量
    };

    const renderObject: IRenderObject = {
        pipeline: {
            vertex: { code: triangleVertWGSL }, fragment: { code: redFragWGSL },
        },
        draw: { vertexCount: 3 },
    };

    canvas.classList.add(styles.animatedCanvasSize);

    function frame()
    {
        // 画布尺寸发生变化时更改渲染通道附件尺寸。
        const currentWidth = canvas.clientWidth * devicePixelRatio;
        const currentHeight = canvas.clientHeight * devicePixelRatio;
        renderPass.attachmentSize = { width: currentWidth, height: currentHeight };

        webgpu.renderPass(renderPass);
        webgpu.renderObject(renderObject);

        webgpu.submit();

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas);
