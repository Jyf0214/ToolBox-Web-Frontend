import { NextRequest, NextResponse } from 'next/server';

/**
 * 腾讯云 EdgeOne Node.js 函数专门适配
 * 1. 强制使用 Node.js 运行时以获得更大内存和完整 API 支持
 * 2. 全流式转发，不占用函数内存，支持大文件 ZIP 上传
 * 3. 强制打印全链路日志
 */

export const runtime = 'nodejs'; // 关键：切换到 Node.js 运行时
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:7860/api';

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathArray } = await params;
  const targetPath = (pathArray ?? []).join('/');
  const queryString = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/${targetPath}${queryString}`;

  const method = req.method;
  
  // 打印请求日志
  console.log(`[PROXY] ${method} -> ${targetUrl}`);

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // 过滤受限头，保留原始内容类型
    if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  try {
    // 关键修复：直接转发 req.body (ReadableStream)，不调用 blob() 或 json()
    // 启用 duplex: 'half' 以支持流式上传
    const fetchOptions: any = {
      method,
      headers,
      body: method !== 'GET' && method !== 'HEAD' ? req.body : undefined,
      duplex: 'half',
      cache: 'no-store'
    };

    const response = await fetch(targetUrl, fetchOptions);

    console.log(`[PROXY] Response: ${response.status} from ${targetUrl}`);

    const resHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        resHeaders.set(key, value);
      }
    });

    // 确保下载头透传
    if (resHeaders.has('content-disposition')) {
      resHeaders.set('Access-Control-Expose-Headers', 'Content-Disposition');
    }

    // 返回流式响应，降低延迟
    return new NextResponse(response.body, {
      status: response.status,
      headers: resHeaders,
    });

  } catch (error: any) {
    // 强制打印详细错误日志到腾讯云控制台
    console.error('--- EDGEONE NODE FUNCTION ERROR ---');
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error(`Target: ${targetUrl}`);
    console.error(`Method: ${method}`);
    console.error(`Error Message: ${error?.message || 'Unknown'}`);
    console.error(`Stack: ${error?.stack}`);
    console.error('--- END ERROR LOG ---');

    return NextResponse.json(
      { 
        success: false, 
        message: '网关代理错误', 
        log: error?.message,
        url: targetUrl 
      },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
