import { test, expect, Page } from "@playwright/test";
import * as fs from 'fs';

// 确保 video 文件夹存在
const videoDir = "video";
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir);
}

test("并发请求 AWOL admin 测试", async ({ page }: { page: Page }) => {
    const url = "http://54.241.41.195/login?redirect=%2Findex";
    const timeout = 2000; // 2 seconds
    const requestsPerSecond = 1; // 每秒请求次数
    const duration = 1; // 持续时间（秒）
    const results: {
        requestNumber: number;
        success: boolean;
        time: number;
        error?: string;
    }[] = []; // 用于记录结果

    // 开始录制追踪
    await page.context().tracing.start({
        screenshots: true,
        snapshots: true,
    });

    const checkLoginCode = async (index: number): Promise<void> => {
        const startTime = Date.now();
        try {
            const response: any = await page.goto(url, { timeout });
            const content = await response.text();
            const success = content.includes("login-code");
            const elapsedTime = Date.now() - startTime;
            results.push({
                requestNumber: index + 1,
                success,
                time: elapsedTime,
            });
        } catch (error) {
            const elapsedTime = Date.now() - startTime;
            results.push({
                requestNumber: index + 1,
                success: false,
                time: elapsedTime,
                error: (error as Error).message,
            });
        }
    };

    for (let second = 0; second < duration; second++) {
        // 每秒发起请求
        const requests = Array.from({ length: requestsPerSecond }, (_, index) =>
            checkLoginCode(second * requestsPerSecond + index)
        );
        await Promise.all(requests); // 等待所有请求完成
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待 1 秒
    }

    // 停止录制追踪并保存到指定路径
    const tracePath = `${videoDir}/trace.zip`;
    await page.context().tracing.stop({ path: tracePath });

    // 输出结果
    results.forEach((result) => {
        const status = result.success ? "成功" : "失败";
        console.log(
            `请求 ${result.requestNumber}: ${status}, 耗时 ${result.time} ms ${
                result.error ? ", 错误: " + result.error : ""
            }`
        );
    });

    console.log("追踪文件已生成: " + tracePath);
});
