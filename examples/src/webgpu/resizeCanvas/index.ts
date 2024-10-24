import redFragWGSL from "../../shaders/red.frag.wgsl";
import triangleVertWGSL from "../../shaders/triangle.vert.wgsl";

import { IGPURenderObject, IGPURenderPassDescriptor, IGPUSubmit, WebGPU } from "webgpu-renderer";
import styles from "./animatedCanvasSize.module.css";

const init = async (canvas: HTMLCanvasElement) =>
{
    const webgpu = await new WebGPU().init();

    const renderPassDescriptor: IGPURenderPassDescriptor = {
        colorAttachments: [{
            view: { texture: { context: { canvasId: canvas.id } } },
            clearValue: [0.0, 0.0, 0.0, 1.0],
        }],
        multisample: 4, // 设置多重采样数量
    };

    const renderObject: IGPURenderObject = {
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
        renderPassDescriptor.attachmentSize = { width: currentWidth, height: currentHeight };

        const data: IGPUSubmit = {
            commandEncoders: [
                {
                    passEncoders: [
                        { descriptor: renderPassDescriptor, renderObjects: [renderObject] },
                    ]
                }
            ],
        };

        webgpu.submit(data);

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas);
