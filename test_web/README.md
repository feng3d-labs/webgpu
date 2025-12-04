# WebGPU 深度附件测试

这是一个在浏览器中运行的 WebGPU 深度附件测试项目。

## 测试内容

该项目包含两个测试用例：

1. **测试 1: 没有深度附件**
   - 验证当没有配置深度附件时，深度测试应该被禁用
   - 先绘制红色三角形（z=-0.5，更靠近），后绘制绿色三角形（z=0.5，更远）
   - 预期结果：后绘制的绿色三角形覆盖先绘制的红色三角形（中心点为绿色）

2. **测试 2: 有深度附件**
   - 验证当配置了深度附件时，深度测试应该被启用
   - 先绘制红色三角形（z=-0.5，更靠近），后绘制绿色三角形（z=0.5，更远）
   - 预期结果：更靠近的红色三角形覆盖更远的绿色三角形（中心点为红色）

## 运行方式

### 方式 1: 使用 Vite 开发服务器（推荐）

在项目根目录运行：

```bash
cd packages/webgpu/test
npm run dev
```

或者从根目录运行：

```bash
npm run test:dev
```

然后在浏览器中打开：
- `http://localhost:3002` - 查看测试套件主页（显示所有测试的状态）
- `http://localhost:3002/depth-attachment-canvas-readpixels.html` - 查看深度附件和画布颜色读取测试

### 方式 2: 构建后运行

```bash
cd packages/webgpu/test
npm run build
npm run preview
```

## 测试说明

- **红色三角形**：z=-0.5，更靠近相机，先绘制
- **绿色三角形**：z=0.5，更远离相机，后绘制

测试会：
1. 直接渲染到画布（使用 CanvasTexture）
2. 使用 `webgpu.readPixels` 直接从画布读取中心点的像素颜色
3. 验证深度测试是否正确工作

## 文件结构

- `index.html` - 测试套件主页，显示所有测试的状态
- `index.ts` - 测试套件管理逻辑
- `depth-attachment-canvas-readpixels.html` - 深度附件和画布颜色读取测试页面
- `depth-attachment-canvas-readpixels.ts` - 深度附件和画布颜色读取测试逻辑
- `vite.config.js` - Vite 配置文件

