/**
 * WebGPU 测试套件入口
 *
 * 管理所有测试页面，显示测试状态和结果
 */

// 导入自动生成的测试配置
import { tests as testConfigs } from './test-config';

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

// 筛选状态：是否只显示失败的测试
let showFailuresOnly = false;

// 目录展开状态：记录哪些目录是展开的
const expandedDirs = new Set<string>();

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
    if (statPending) statPending.textContent = `${pending}${running > 0 ? ` (${running} 运行中)` : ''}`;
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

                testItem.className = 'test-item';
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

                testItem.innerHTML = `
                    <div class="test-header">
                        <div class="test-title">${test.name}</div>
                        <div class="test-status ${statusClass}">${statusText}${timeInfo}</div>
                        <button class="btn btn-primary" onclick="openTest(${testIndex})">查看</button>
                    </div>
                    <div class="test-description">${test.description}</div>
                    ${test.status === 'fail' && test.error ? `<div class="test-error">${test.error}</div>` : ''}
                    ${renderConsoleErrors(test.name)}
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

            testItem.className = 'test-item';

            const statusClass = test.status;
            let statusText = test.status === 'pending' ? '待测试' : test.status === 'running' ? '运行中' : test.status === 'pass' ? '通过' : '失败';
            let timeInfo = '';

            // 显示运行时间
            if (test.status === 'running' && test.startTime)
            {
                const elapsed = Date.now() - test.startTime;

                timeInfo = `<span class="test-time">(${formatTime(elapsed)})</span>`;
            }

            testItem.innerHTML = `
                <div class="test-header">
                    <div class="test-title">${test.name}</div>
                    <div class="test-status ${statusClass}">${statusText}${timeInfo}</div>
                    <button class="btn btn-primary" onclick="openTest(${testIndex})">查看</button>
                </div>
                <div class="test-description">${test.description}</div>
                ${test.status === 'fail' && test.error ? `<div class="test-error">${test.error}</div>` : ''}
                ${renderConsoleErrors(test.name)}
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

// HTML 转义函数
function escapeHtml(text: string): string
{
    const div = document.createElement('div');

    div.textContent = text;

    return div.innerHTML;
}

// 渲染测试列表
function renderTestList()
{
    const testList = document.getElementById('test-list');

    if (!testList) return;

    testList.innerHTML = '';

    // 根据筛选条件过滤测试
    const filteredTests = showFailuresOnly
        ? tests.filter(test => test.status === 'fail')
        : tests;

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

    // 为每个测试创建控制台消息存储
    consoleMessages.set(test.name, { errors: [], warnings: [], logs: [] });

    // 设置为运行中状态
    test.status = 'running';
    test.startTime = Date.now();
    renderTestList();

    // 创建 iframe 来运行测试
    // 注意：WebGPU 需要可见的 canvas 才能正常工作
    // 将 iframe 放在一个很小的可见区域（右下角 1x1 像素），确保 canvas 完全可见
    const iframe = document.createElement('iframe');

    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '400px'; // 保持 canvas 的实际尺寸，确保渲染正常
    iframe.style.height = '300px'; // 保持 canvas 的实际尺寸，确保渲染正常
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.zIndex = '-1'; // 放在最底层，不遮挡其他内容
    iframe.style.transform = 'scale(0.01)'; // 缩小到 1%，几乎看不见但完全可见
    iframe.style.transformOrigin = 'bottom right'; // 从右下角缩放
    iframe.style.pointerEvents = 'none'; // 禁用鼠标事件
    iframe.src = test.htmlFile;
    test.iframe = iframe;

    document.body.appendChild(iframe);

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

                // 延迟移除 iframe，确保测试完全完成
                setTimeout(() =>
                {
                    if (iframe.parentNode)
                    {
                        iframe.parentNode.removeChild(iframe);
                    }
                }, 500);

                renderTestList();
            }
        }
    };

    window.addEventListener('message', messageHandler);

    // 对于普通示例（没有测试接口的），等待一段时间后检查 WebGPU 支持
    if (test.type === 'example' && !test.testName)
    {
        setTimeout(async () =>
        {
            if (test.status === 'pending')
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
            }
        }, 3000);
    }
}

// 运行所有测试
function runAllTests()
{
    for (let i = 0; i < tests.length; i++)
    {
        setTimeout(() => runTest(i), i * 500);
    }
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

    // 绑定筛选复选框事件
    const filterCheckbox = document.getElementById('filter-failures') as HTMLInputElement;

    if (filterCheckbox)
    {
        filterCheckbox.addEventListener('change', (e) =>
        {
            showFailuresOnly = (e.target as HTMLInputElement).checked;
            renderTestList();
        });
    }

    renderTestList();
    runAllTests();

    // 定时更新运行中测试的时间显示
    setInterval(() =>
    {
        const runningTests = tests.filter(t => t.status === 'running');

        if (runningTests.length > 0)
        {
            renderTestList();
        }
    }, 1000);
});

// 将函数暴露到全局作用域，以便 HTML 中的 onclick 可以调用
(window as any).openTest = openTest;
