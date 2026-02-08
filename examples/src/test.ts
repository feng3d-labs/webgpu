/**
 * WebGPU 测试套件入口
 *
 * 管理所有测试页面，显示测试状态和结果
 */

// 导入自动生成的测试配置
import { tests as testConfigs } from './test-config';
// 导入纯黑色渲染检测函数
import { isRenderBlack } from './testlib/test-wrapper';

// 存储控制台日志
const consoleMessages: Map<string, { errors: string[]; warnings: string[]; logs: string[] }> = new Map();

// 拦截全局错误
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) =>
{
    const message = args.map(arg =>
        typeof arg === 'string' ? arg : (arg?.message || JSON.stringify(arg)),
    ).join(' ');

    // 尝试找到当前正在运行的测试
    const runningTest = tests.find(t => t.status === 'pending' && t.iframe);

    if (runningTest)
    {
        const messages = consoleMessages.get(runningTest.name);

        if (messages)
        {
            messages.errors.push(message);
        }
    }

    originalError.apply(console, args);
};

console.warn = (...args: any[]) =>
{
    const message = args.map(arg =>
        typeof arg === 'string' ? arg : JSON.stringify(arg),
    ).join(' ');

    // 尝试找到当前正在运行的测试
    const runningTest = tests.find(t => t.status === 'pending' && t.iframe);

    if (runningTest)
    {
        const messages = consoleMessages.get(runningTest.name);

        if (messages)
        {
            messages.warnings.push(message);
        }
    }

    originalWarn.apply(console, args);
};

// 监听全局未捕获的错误
window.addEventListener('error', (event) =>
{
    const runningTest = tests.find(t => t.status === 'pending' && t.iframe);

    if (runningTest)
    {
        const messages = consoleMessages.get(runningTest.name);

        if (messages)
        {
            messages.errors.push(`未捕获的错误: ${event.message}`);
        }
    }
});

// 监听未处理的 Promise 拒绝
window.addEventListener('unhandledrejection', (event) =>
{
    const runningTest = tests.find(t => t.status === 'pending' && t.iframe);

    if (runningTest)
    {
        const messages = consoleMessages.get(runningTest.name);

        if (messages)
        {
            messages.errors.push(`未处理的 Promise 拒绝: ${event.reason}`);
        }
    }
});

interface TestInfo
{
    name: string;
    description: string;
    htmlFile: string;
    status: 'pending' | 'running' | 'pass' | 'fail';
    error?: string;
    testName?: string; // 用于匹配 postMessage 中的 testName
    dirPath?: string; // 目录路径（相对于根目录）
    iframe?: HTMLIFrameElement;
    type: 'spectest' | 'example'; // 测试类型
    startTime?: number; // 测试开始时间
    /** 测试返回的渲染结果数据 */
    renderData?: string;
    /** 渲染结果类型 */
    renderDataType?: 'png' | 'jpeg' | 'webp';
    /** 测试返回的完整日志 */
    testLogs?: TestLogItem[];
}

/** 测试日志项 */
interface TestLogItem
{
    level: 'log' | 'info' | 'warn' | 'error' | 'debug';
    message: string;
    timestamp?: number;
}

// 从配置文件初始化测试列表
function initializeTests(): TestInfo[]
{
    return testConfigs.map((config) => ({
        name: config.name,
        description: config.description,
        htmlFile: config.htmlFile,
        testName: config.testName,
        dirPath: config.dirPath,
        type: config.type,
        status: 'pending' as const,
    }));
}

// 定义所有测试
const tests: TestInfo[] = initializeTests();

// 筛选状态：当前选择的过滤类型
type FilterType = 'all' | 'pass' | 'fail' | 'running' | 'pending';
let currentFilter: FilterType = 'all';

// 搜索关键词
let searchKeyword = '';

// 目录展开状态：记录哪些目录是展开的
const expandedDirs = new Set<string>();

// 测试详情展开状态：记录哪些测试的详情已展开
const expandedTests = new Set<string>();

// 最大并发测试数量
const MAX_CONCURRENT_TESTS = 1;

// 待运行测试队列
let testQueue: number[] = [];
let runningCount = 0;

// 更新统计信息
function updateSummary()
{
    const total = tests.length;
    const pass = tests.filter(t => t.status === 'pass').length;
    const fail = tests.filter(t => t.status === 'fail').length;
    const running = tests.filter(t => t.status === 'running').length;
    const pending = tests.filter(t => t.status === 'pending').length;

    const statTotal = document.getElementById('stat-total');
    const statPass = document.getElementById('stat-pass');
    const statFail = document.getElementById('stat-fail');
    const statPending = document.getElementById('stat-pending');

    if (statTotal) statTotal.textContent = total.toString();
    if (statPass) statPass.textContent = pass.toString();
    if (statFail) statFail.textContent = fail.toString();
    if (statPending) statPending.textContent = `${pending}${running > 0 ? ` (${running}/${MAX_CONCURRENT_TESTS})` : ''}`;
}

// 目录树节点接口
interface DirNode
{
    name: string; // 目录名称（最后一级）
    fullPath: string; // 完整路径
    level: number; // 层级深度
    tests: TestInfo[]; // 该目录下的测试
    children: Map<string, DirNode>; // 子目录
}

// 构建目录树
function buildDirTree(filteredTests: TestInfo[]): DirNode
{
    const root: DirNode = {
        name: '',
        fullPath: '.',
        level: 0,
        tests: [],
        children: new Map(),
    };

    filteredTests.forEach((test) =>
    {
        const dirPath = test.dirPath || '.';

        if (dirPath === '.')
        {
            root.tests.push(test);
        }
        else
        {
            const parts = dirPath.split('/');
            let current = root;

            parts.forEach((part, index) =>
            {
                if (!current.children.has(part))
                {
                    current.children.set(part, {
                        name: part,
                        fullPath: parts.slice(0, index + 1).join('/'),
                        level: index + 1,
                        tests: [],
                        children: new Map(),
                    });
                }
                current = current.children.get(part)!;
            });

            current.tests.push(test);
        }
    });

    return root;
}

// 递归收集所有目录路径
function collectAllDirPaths(node: DirNode, paths: Set<string>)
{
    node.children.forEach((child) =>
    {
        paths.add(child.fullPath);
        collectAllDirPaths(child, paths);
    });
}

// 递归渲染目录节点
function renderDirNode(node: DirNode, parentElement: HTMLElement)
{
    // 排序：按名称字母顺序排列
    const sortedChildren = Array.from(node.children.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
    );

    // 渲染子目录
    sortedChildren.forEach((child) =>
    {
        const isExpanded = expandedDirs.has(child.fullPath);

        // 目录标题
        const dirHeader = document.createElement('div');

        dirHeader.className = 'test-dir-header';
        dirHeader.style.cursor = 'pointer';
        dirHeader.style.paddingLeft = `${8 + child.level * 16}px`; // 根据层级缩进
        dirHeader.onclick = () => toggleDir(child.fullPath);

        const icon = document.createElement('span');

        icon.className = 'dir-icon';
        icon.textContent = isExpanded ? '▼' : '▶';
        icon.style.marginRight = '6px';
        icon.style.display = 'inline-block';
        icon.style.width = '10px';
        icon.style.fontSize = '9px';

        const dirName = document.createElement('span');

        dirName.textContent = child.name;

        dirHeader.appendChild(icon);
        dirHeader.appendChild(dirName);

        parentElement.appendChild(dirHeader);

        // 如果目录展开，显示测试项和子目录
        if (isExpanded)
        {
            // 渲染该目录下的测试
            child.tests.forEach((test) =>
            {
                const testIndex = tests.indexOf(test);
                const testItem = document.createElement('div');

                const isDetailExpanded = expandedTests.has(test.name);

                testItem.className = `test-item${isDetailExpanded ? ' detail-expanded' : ''}`;
                testItem.style.marginLeft = `${8 + (child.level + 1) * 16}px`; // 测试项缩进

                const statusClass = test.status;
                let statusText = test.status === 'pending' ? '待测试' : test.status === 'running' ? '运行中' : test.status === 'pass' ? '通过' : '失败';
                let timeInfo = '';

                // 显示运行时间
                if (test.status === 'running' && test.startTime)
                {
                    const elapsed = Date.now() - test.startTime;

                    timeInfo = `<span class="test-time">(${formatTime(elapsed)})</span>`;
                }
                else if ((test.status === 'pass' || test.status === 'fail') && test.startTime)
                {
                    // 计算总耗时（估算）
                    const elapsed = test.status === 'pass' ? 1000 : 5000; // 简化显示

                    timeInfo = `<span class="test-time">(${formatTime(elapsed)})</span>`;
                }

                // 按钮配置
                let buttons = '';

                if (test.status === 'pending' || test.status === 'fail')
                {
                    buttons += `<button class="btn btn-run" onclick="event.stopPropagation(); runTest(${testIndex})">运行</button>`;
                }
                if (test.status === 'pass' || test.status === 'fail')
                {
                    buttons += `<button class="btn btn-reset" onclick="event.stopPropagation(); resetTest(${testIndex})">重置</button>`;
                }
                // 如果有渲染数据，点击查看展开详情；否则在新窗口打开
                const viewButtonAction = test.renderData
                    ? `toggleTestDetail('${test.name.replace(/'/g, "\\'")}')`
                    : `openTest(${testIndex})`;

                buttons += `<button class="btn btn-primary" onclick="event.stopPropagation(); ${viewButtonAction}">查看</button>`;

                // 展开图标
                const expandIcon = isDetailExpanded ? '▼' : '▶';

                testItem.innerHTML = `
                    <div class="test-header" onclick="toggleTestDetail('${test.name.replace(/'/g, "\\'")}')">
                        <span class="test-expand-icon">${expandIcon}</span>
                        <div class="test-title">${test.name}</div>
                        <div class="test-status ${statusClass}">${statusText}${timeInfo}</div>
                        <div class="test-buttons">${buttons}</div>
                    </div>
                    <div class="test-description">${test.description}</div>
                    ${test.status === 'fail' && test.error ? `<div class="test-error">${test.error}</div>` : ''}
                    ${renderTestDetail(test)}
                `;

                parentElement.appendChild(testItem);
            });

            // 递归渲染子目录
            renderDirNode(child, parentElement);
        }
    });

    // 渲染根目录下的测试（如果有）
    if (node.level === 0 && node.tests.length > 0)
    {
        node.tests.forEach((test) =>
        {
            const testIndex = tests.indexOf(test);
            const testItem = document.createElement('div');

            const isDetailExpanded = expandedTests.has(test.name);

            testItem.className = `test-item${isDetailExpanded ? ' detail-expanded' : ''}`;

            const statusClass = test.status;
            let statusText = test.status === 'pending' ? '待测试' : test.status === 'running' ? '运行中' : test.status === 'pass' ? '通过' : '失败';
            let timeInfo = '';

            // 显示运行时间
            if (test.status === 'running' && test.startTime)
            {
                const elapsed = Date.now() - test.startTime;

                timeInfo = `<span class="test-time">(${formatTime(elapsed)})</span>`;
            }

            // 按钮配置
            let buttons = '';

            if (test.status === 'pending' || test.status === 'fail')
            {
                buttons += `<button class="btn btn-run" onclick="event.stopPropagation(); runTest(${testIndex})">运行</button>`;
            }
            if (test.status === 'pass' || test.status === 'fail')
            {
                buttons += `<button class="btn btn-reset" onclick="event.stopPropagation(); resetTest(${testIndex})">重置</button>`;
            }
            buttons += `<button class="btn btn-primary" onclick="event.stopPropagation(); openTest(${testIndex})">查看</button>`;

            // 展开图标
            const expandIcon = isDetailExpanded ? '▼' : '▶';

            testItem.innerHTML = `
                <div class="test-header" onclick="toggleTestDetail('${test.name.replace(/'/g, "\\'")}')">
                    <span class="test-expand-icon">${expandIcon}</span>
                    <div class="test-title">${test.name}</div>
                    <div class="test-status ${statusClass}">${statusText}${timeInfo}</div>
                    <div class="test-buttons">${buttons}</div>
                </div>
                <div class="test-description">${test.description}</div>
                ${test.status === 'fail' && test.error ? `<div class="test-error">${test.error}</div>` : ''}
                ${renderTestDetail(test)}
            `;

            parentElement.appendChild(testItem);
        });
    }
}

// 格式化时间显示
function formatTime(ms: number): string
{
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;

    return `${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`;
}

// 渲染控制台错误信息
function renderConsoleErrors(testName: string): string
{
    const messages = consoleMessages.get(testName);

    if (!messages || (messages.errors.length === 0 && messages.warnings.length === 0))
    {
        return '';
    }

    let html = '<div class="test-console-output">';

    if (messages.errors.length > 0)
    {
        html += '<div class="console-errors">控制台错误:</div>';
        messages.errors.slice(0, 5).forEach(err =>
        {
            html += `<div class="console-error-line">- ${escapeHtml(err)}</div>`;
        });
        if (messages.errors.length > 5)
        {
            html += `<div class="console-error-line">... 还有 ${messages.errors.length - 5} 个错误</div>`;
        }
    }
    if (messages.warnings.length > 0)
    {
        html += '<div class="console-warnings">警告:</div>';
        messages.warnings.slice(0, 3).forEach(warn =>
        {
            html += `<div class="console-warn-line">- ${escapeHtml(warn)}</div>`;
        });
    }
    html += '</div>';

    return html;
}

// 切换测试详情展开/收起
function toggleTestDetail(testName: string)
{
    if (expandedTests.has(testName))
    {
        expandedTests.delete(testName);
    }
    else
    {
        expandedTests.add(testName);
    }
    renderTestList();
}

// 渲染测试详情面板（展开时显示的内容）
function renderTestDetail(test: TestInfo): string
{
    const isExpanded = expandedTests.has(test.name);

    if (!isExpanded)
    {
        return '';
    }

    let html = '<div class="test-detail-panel">';

    // 使用左右布局
    html += '<div class="test-detail-content">';

    // 左侧：渲染画面预览区域
    html += '<div class="test-detail-left">';
    html += '<div class="test-detail-title">渲染画面</div>';

    // 如果测试返回了渲染结果数据，直接显示
    if (test.renderData)
    {
        const imageId = `render-${test.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const dataUrl = `data:image/${test.renderDataType || 'png'};base64,${test.renderData}`;

        html += `<div class="test-preview-container">`;
        html += `<img id="${imageId}" class="test-render-image" src="${dataUrl}" alt="渲染结果" />`;
        html += `<div class="test-preview-actions">
            <button class="btn btn-primary" onclick="event.stopPropagation(); openTest(${tests.indexOf(test)})">在新窗口打开</button>
            <button class="btn btn-secondary" onclick="event.stopPropagation(); downloadRender('${dataUrl}', '${test.name}')">下载图片</button>
        </div>`;
        html += '</div>';
    }
    // 如果没有返回渲染数据但测试已完成，使用 iframe 预览
    else if (test.status === 'pass' || test.status === 'fail')
    {
        const previewId = `preview-${test.name.replace(/[^a-zA-Z0-9]/g, '-')}`;

        html += `<div class="test-preview-container">`;
        html += `<iframe id="${previewId}" class="test-preview-iframe" src="${test.htmlFile}?preview=true"></iframe>`;
        html += `<div class="test-preview-actions">
            <button class="btn btn-primary" onclick="event.stopPropagation(); openTest(${tests.indexOf(test)})">在新窗口打开</button>
            <button class="btn btn-secondary" onclick="event.stopPropagation(); refreshPreview('${previewId}')">刷新</button>
        </div>`;
        html += '</div>';
    }
    else
    {
        html += '<div class="test-preview-empty">请先运行测试以查看渲染画面</div>';
    }
    html += '</div>';

    // 右侧：日志区域
    html += '<div class="test-detail-right">';
    html += '<div class="test-detail-title">控制台日志</div>';

    // 优先显示测试返回的完整日志
    if (test.testLogs && test.testLogs.length > 0)
    {
        html += '<div class="test-logs-content">';
        test.testLogs.forEach((log) =>
        {
            const levelClass = `console-${log.level}-line`;
            const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
            const timeStr = timestamp ? `<span class="log-time">[${timestamp}]</span>` : '';

            html += `<div class="${levelClass}">${timeStr}${escapeHtml(log.message)}</div>`;
        });
        html += '</div>';
    }
    // 否则显示捕获的控制台消息
    else
    {
        const messages = consoleMessages.get(test.name);

        if (messages && (messages.errors.length > 0 || messages.warnings.length > 0 || messages.logs.length > 0))
        {
            html += '<div class="test-logs-content">';
            if (messages.logs.length > 0)
            {
                html += '<div class="console-logs">日志:</div>';
                messages.logs.slice(0, 10).forEach(log =>
                {
                    html += `<div class="console-log-line">- ${escapeHtml(log)}</div>`;
                });
            }
            if (messages.errors.length > 0)
            {
                html += '<div class="console-errors">错误:</div>';
                messages.errors.slice(0, 10).forEach(err =>
                {
                    html += `<div class="console-error-line">- ${escapeHtml(err)}</div>`;
                });
            }
            if (messages.warnings.length > 0)
            {
                html += '<div class="console-warnings">警告:</div>';
                messages.warnings.slice(0, 10).forEach(warn =>
                {
                    html += `<div class="console-warn-line">- ${escapeHtml(warn)}</div>`;
                });
            }
            html += '</div>';
        }
        else
        {
            html += '<div class="test-logs-empty">暂无日志</div>';
        }
    }
    html += '</div>';

    html += '</div>'; // 结束 test-detail-content
    html += '</div>'; // 结束 test-detail-panel

    return html;
}

// 下载渲染结果图片
function downloadRender(dataUrl: string, testName: string)
{
    const link = document.createElement('a');

    link.href = dataUrl;
    link.download = `${testName}-render.png`;
    link.click();
}

// 刷新预览 iframe
function refreshPreview(iframeId: string)
{
    const iframe = document.getElementById(iframeId) as HTMLIFrameElement;

    if (iframe)
    {
        // 通过重新赋值来刷新 iframe
        const currentSrc = iframe.src;

        iframe.src = '';
        iframe.src = currentSrc;
    }
}

// HTML 转义函数
function escapeHtml(text: string): string
{
    const div = document.createElement('div');

    div.textContent = text;

    return div.innerHTML;
}

// 重置测试状态
export function resetTest(index: number)
{
    const test = tests[index];

    if (!test) return;

    // 移除 iframe（如果存在）
    if (test.iframe && test.iframe.parentNode)
    {
        test.iframe.parentNode.removeChild(test.iframe);
    }

    // 重置状态
    test.status = 'pending';
    test.error = undefined;
    test.startTime = undefined;
    test.iframe = undefined;

    // 清除控制台消息
    consoleMessages.delete(test.name);

    renderTestList();
}

// 渲染测试列表
function renderTestList()
{
    const testList = document.getElementById('test-list');

    if (!testList) return;

    testList.innerHTML = '';

    // 根据筛选条件和搜索关键词过滤测试
    let filteredTests = tests;

    // 应用状态过滤
    if (currentFilter !== 'all')
    {
        filteredTests = filteredTests.filter(test => test.status === currentFilter);
    }

    // 应用搜索关键词过滤
    if (searchKeyword.trim())
    {
        const keyword = searchKeyword.toLowerCase();

        filteredTests = filteredTests.filter(test =>
            test.name.toLowerCase().includes(keyword) ||
            test.description.toLowerCase().includes(keyword),
        );
    }

    // 构建目录树
    const dirTree = buildDirTree(filteredTests);

    // 递归渲染目录树
    renderDirNode(dirTree, testList);

    updateSummary();
}

// 打开测试页面
export function openTest(index: number)
{
    const test = tests[index];

    if (test)
    {
        window.open(test.htmlFile, '_blank');
    }
}

// 检查 WebGPU 是否可用
async function checkWebGPU(): Promise<{ success: boolean; error?: string }>
{
    try
    {
        const gpu = (navigator as any).gpu;

        if (!gpu)
        {
            return { success: false, error: 'WebGPU 不受支持' };
        }
        const adapter = await gpu.requestAdapter();

        if (!adapter)
        {
            return { success: false, error: '没有可用的 WebGPU 适配器' };
        }
        adapter.dispose();

        return { success: true };
    }
    catch (e)
    {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
}

// 运行单个测试
function runTest(index: number)
{
    const test = tests[index];

    if (!test) return;

    // 如果已经在运行中，不重复运行
    if (test.status === 'running') return;

    // 增加运行计数
    runningCount++;

    // 为每个测试创建控制台消息存储
    consoleMessages.set(test.name, { errors: [], warnings: [], logs: [] });

    // 设置为运行中状态
    test.status = 'running';
    test.startTime = Date.now();
    renderTestList();

    // 创建 iframe 来运行测试
    // 注意：WebGPU 需要可见的 canvas 才能正常工作
    // 将 iframe 放在屏幕外（左侧）但保持完全可见，避免 transform scale 导致的渲染问题
    const iframe = document.createElement('iframe');

    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px'; // 移到屏幕外左侧，但保持完全可见
    iframe.style.top = '0';
    iframe.style.width = '800px'; // 保持足够大的尺寸
    iframe.style.height = '600px'; // 保持足够大的尺寸
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.pointerEvents = 'none'; // 禁用鼠标事件
    iframe.src = test.htmlFile;
    test.iframe = iframe;

    document.body.appendChild(iframe);

    // 测试完成后的清理函数
    const cleanup = () =>
    {
        runningCount--;
        processQueue(); // 处理队列中的下一个测试
    };

    // 超时处理已移除，测试会等待直到完成

    iframe.onerror = () =>
    {
        test.status = 'fail';
        test.error = 'iframe 加载失败';
        renderTestList();

        if (iframe.parentNode)
        {
            iframe.parentNode.removeChild(iframe);
        }
        cleanup();
    };

    // 检查是否被重定向到主页
    iframe.onload = () =>
    {
        try
        {
            if (iframe.contentWindow && iframe.contentWindow.location.pathname === '/index.html')
            {
                test.status = 'fail';
                test.error = 'iframe 被重定向到主页，可能页面不存在或加载失败。';
                renderTestList();
                if (iframe.parentNode)
                {
                    iframe.parentNode.removeChild(iframe);
                }
                cleanup();
            }
        }
        catch (e)
        {
            // 跨域错误，无法访问 iframe.contentWindow.location
            // 忽略此错误，依靠 onerror 或超时处理
        }
    };

    // 监听 iframe 发送的消息
    const messageHandler = (event: MessageEvent) =>
    {
        if (event.data && event.data.type === 'test-result')
        {
            // 对于 spectest，使用 testName 匹配
            // 对于 example，使用 htmlFile 匹配（没有 testName 的情况）
            const isMatch = test.type === 'spectest'
                ? event.data.testName === test.testName
                : event.data.testName === test.testName || (!test.testName && event.source === iframe.contentWindow);

            if (isMatch)
            {
                window.removeEventListener('message', messageHandler);

                test.status = event.data.passed ? 'pass' : 'fail';

                // 保存测试返回的渲染结果数据
                if (event.data.renderData)
                {
                    test.renderData = event.data.renderData;
                    test.renderDataType = event.data.renderDataType || 'png';
                }

                // 保存测试返回的完整日志
                if (event.data.logs && Array.isArray(event.data.logs))
                {
                    test.testLogs = event.data.logs;
                }

                // 检查是否有控制台错误
                const messages = consoleMessages.get(test.name);
                const hasErrors = messages && messages.errors.length > 0;

                if (event.data.message)
                {
                    test.error = event.data.message;
                    // 如果测试通过但有控制台错误，添加警告信息
                    if (event.data.passed && hasErrors)
                    {
                        test.error += `\n（但有 ${messages.errors.length} 个控制台错误）`;
                    }
                }
                else if (!event.data.passed)
                {
                    test.error = '测试失败，但未提供详细错误信息';
                }
                else if (hasErrors)
                {
                    // 测试通过但有控制台错误
                    test.error = `测试通过，但有 ${messages.errors.length} 个控制台错误`;
                    test.status = 'fail'; // 将状态改为失败
                }

                // 检查渲染结果是否为纯黑色（对于通过且没有错误消息的测试）
                if (test.status === 'pass' && test.renderData)
                {
                    // 异步检查渲染结果
                    isRenderBlack(test.renderData).then((isBlack) =>
                    {
                        if (isBlack)
                        {
                            test.status = 'fail';
                            if (test.error)
                            {
                                test.error += '\n渲染结果为纯黑色，可能存在渲染问题';
                            }
                            else
                            {
                                test.error = '渲染结果为纯黑色，可能存在渲染问题';
                            }
                            renderTestList();
                        }
                    }).catch((e) =>
                    {
                        console.warn('检查渲染结果时出错:', e);
                    });
                }

                // 延迟移除 iframe，确保测试完全完成
                setTimeout(() =>
                {
                    if (iframe.parentNode)
                    {
                        iframe.parentNode.removeChild(iframe);
                    }
                }, 500);

                renderTestList();
                cleanup();
            }
        }
    };

    window.addEventListener('message', messageHandler);

    // 对于普通示例（没有测试接口的），等待一段时间后检查 WebGPU 支持
    if (test.type === 'example' && !test.testName)
    {
        setTimeout(async () =>
        {
            if (test.status === 'running')
            {
                // 检查 WebGPU 是否可用
                const result = await checkWebGPU();

                if (result.success)
                {
                    test.status = 'pass';
                }
                else
                {
                    test.status = 'fail';
                    test.error = result.error || 'WebGPU 初始化失败';
                }
                renderTestList();

                // 移除 iframe
                if (iframe.parentNode)
                {
                    iframe.parentNode.removeChild(iframe);
                }
                cleanup();
            }
        }, 3000);
    }
}

// 处理队列中的测试
function processQueue()
{
    while (testQueue.length > 0 && runningCount < MAX_CONCURRENT_TESTS)
    {
        const index = testQueue.shift()!;

        runTest(index);
    }
}

// 将测试添加到队列
function queueTest(index: number)
{
    if (!testQueue.includes(index))
    {
        testQueue.push(index);
        processQueue();
    }
}

// 运行所有测试
function runAllTests()
{
    testQueue = [];
    runningCount = 0;

    for (let i = 0; i < tests.length; i++)
    {
        // 只运行待测试的测试
        if (tests[i].status === 'pending')
        {
            testQueue.push(i);
        }
    }

    // 开始处理队列
    processQueue();
}

// 切换目录展开/收拢状态
function toggleDir(dirPath: string)
{
    if (expandedDirs.has(dirPath))
    {
        expandedDirs.delete(dirPath);
    }
    else
    {
        expandedDirs.add(dirPath);
    }
    renderTestList();
}

// 设置过滤按钮状态
function updateFilterButtons()
{
    const buttons = document.querySelectorAll('.filter-btn');

    buttons.forEach(btn =>
    {
        const filter = btn.getAttribute('data-filter') as FilterType;

        if (filter === currentFilter)
        {
            btn.classList.add('active');
            btn.classList.add(`active-filter-${filter}`);
        }
        else
        {
            btn.classList.remove('active');
            btn.classList.remove(`active-filter-${filter}`);
        }
    });
}

// 切换过滤类型
function setFilter(filter: FilterType)
{
    currentFilter = filter;
    updateFilterButtons();
    renderTestList();
}

// 初始化
document.addEventListener('DOMContentLoaded', () =>
{
    // 构建目录树以收集所有目录路径
    const dirTree = buildDirTree(tests);
    const allDirPaths = new Set<string>();

    collectAllDirPaths(dirTree, allDirPaths);

    // 默认展开所有目录
    allDirPaths.forEach((dirPath) =>
    {
        expandedDirs.add(dirPath);
    });

    // 绑定过滤按钮事件
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn =>
    {
        btn.addEventListener('click', () =>
        {
            const filter = btn.getAttribute('data-filter') as FilterType;

            setFilter(filter);
        });
    });

    // 绑定搜索输入事件
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const clearSearch = document.getElementById('clear-search');

    if (searchInput)
    {
        searchInput.addEventListener('input', (e) =>
        {
            searchKeyword = (e.target as HTMLInputElement).value;
            renderTestList();
        });
    }

    if (clearSearch)
    {
        clearSearch.addEventListener('click', () =>
        {
            if (searchInput)
            {
                searchInput.value = '';
                searchKeyword = '';
                renderTestList();
            }
        });
    }

    renderTestList();

    // 不再自动运行所有测试，用户需要点击"运行所有"按钮
    // runAllTests();

    // 绑定"运行所有"按钮
    const runAllBtn = document.getElementById('run-all-btn');

    if (runAllBtn)
    {
        runAllBtn.addEventListener('click', () =>
        {
            runAllTests();
            // 禁用按钮防止重复点击
            (runAllBtn as HTMLButtonElement).disabled = true;
            runAllBtn.textContent = '运行中...';
        });
    }

    // 定时更新运行中测试的时间显示
    setInterval(() =>
    {
        const runningTests = tests.filter(t => t.status === 'running');

        if (runningTests.length > 0)
        {
            renderTestList();
        }
        else
        {
            // 所有测试完成，恢复"运行所有"按钮
            const runAllBtn = document.getElementById('run-all-btn');

            if (runAllBtn)
            {
                (runAllBtn as HTMLButtonElement).disabled = false;
                runAllBtn.textContent = '运行所有';
            }
        }
    }, 1000);
});

// 将函数暴露到全局作用域，以便 HTML 中的 onclick 可以调用
(window as any).openTest = openTest;
(window as any).runTest = runTest;
(window as any).resetTest = resetTest;
(window as any).toggleTestDetail = toggleTestDetail;
(window as any).refreshPreview = refreshPreview;
(window as any).downloadRender = downloadRender;
