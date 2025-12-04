/**
 * WebGPU 测试套件入口
 *
 * 管理所有测试页面，显示测试状态和结果
 */

// 导入自动生成的测试配置
import { tests as testConfigs } from './test-config';

interface TestInfo
{
    name: string;
    description: string;
    htmlFile: string;
    status: 'pending' | 'pass' | 'fail';
    error?: string;
    testName?: string; // 用于匹配 postMessage 中的 testName
    iframe?: HTMLIFrameElement;
}

// 从配置文件初始化测试列表
function initializeTests(): TestInfo[]
{
    return testConfigs.map((config) => ({
        name: config.name,
        description: config.description,
        htmlFile: config.htmlFile,
        testName: config.testName,
        status: 'pending' as const,
    }));
}

// 定义所有测试
const tests: TestInfo[] = initializeTests();

// 更新统计信息
function updateSummary()
{
    const total = tests.length;
    const pass = tests.filter(t => t.status === 'pass').length;
    const fail = tests.filter(t => t.status === 'fail').length;
    const pending = tests.filter(t => t.status === 'pending').length;

    const statTotal = document.getElementById('stat-total');
    const statPass = document.getElementById('stat-pass');
    const statFail = document.getElementById('stat-fail');
    const statPending = document.getElementById('stat-pending');

    if (statTotal) statTotal.textContent = total.toString();
    if (statPass) statPass.textContent = pass.toString();
    if (statFail) statFail.textContent = fail.toString();
    if (statPending) statPending.textContent = pending.toString();
}

// 渲染测试列表
function renderTestList()
{
    const testList = document.getElementById('test-list');
    if (!testList) return;

    testList.innerHTML = '';

    tests.forEach((test, index) =>
    {
        const testItem = document.createElement('div');
        testItem.className = 'test-item';

        const statusClass = test.status;
        const statusText = test.status === 'pending' ? '待测试' : test.status === 'pass' ? '通过' : '失败';

        testItem.innerHTML = `
            <div class="test-header">
                <div class="test-title">${test.name}</div>
                <div class="test-status ${statusClass}">${statusText}</div>
                <button class="btn btn-primary" onclick="openTest(${index})">查看</button>
            </div>
            <div class="test-description">${test.description}</div>
            ${test.status === 'fail' && test.error ? `<div class="test-error">${test.error}</div>` : ''}
        `;

        testList.appendChild(testItem);
    });

    updateSummary();
}

// 打开测试页面
function openTest(index: number)
{
    const test = tests[index];
    if (test)
    {
        window.open(test.htmlFile, '_blank');
    }
}

// 运行单个测试
function runTest(index: number)
{
    const test = tests[index];
    if (!test) return;

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

    // 设置超时，如果 30 秒内没有收到结果，标记为失败
    const timeout = setTimeout(() =>
    {
        if (test.status === 'pending')
        {
            test.status = 'fail';
            test.error = '测试超时（30秒内未完成）';
            renderTestList();

            // 移除 iframe
            if (iframe.parentNode)
            {
                iframe.parentNode.removeChild(iframe);
            }
        }
    }, 30000);

    iframe.onerror = () =>
    {
        clearTimeout(timeout);
        test.status = 'fail';
        test.error = 'iframe 加载失败';
        renderTestList();

        if (iframe.parentNode)
        {
            iframe.parentNode.removeChild(iframe);
        }
    };

    // 监听 iframe 发送的消息
    const messageHandler = (event: MessageEvent) =>
    {
        if (event.data && event.data.type === 'test-result' && event.data.testName === test.testName)
        {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);

            test.status = event.data.passed ? 'pass' : 'fail';
            if (event.data.message)
            {
                test.error = event.data.message;
            }
            else if (!event.data.passed)
            {
                test.error = '测试失败，但未提供详细错误信息';
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
    };

    window.addEventListener('message', messageHandler);
}

// 运行所有测试
function runAllTests()
{
    for (let i = 0; i < tests.length; i++)
    {
        setTimeout(() => runTest(i), i * 500);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () =>
{
    renderTestList();
    runAllTests();
});

// 将函数暴露到全局作用域，以便 HTML 中的 onclick 可以调用
(window as any).openTest = openTest;

