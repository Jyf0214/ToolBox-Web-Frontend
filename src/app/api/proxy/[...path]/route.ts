import { NextRequest, NextResponse } from 'next/server';

/**
 * 针对 EdgeOne Pages 专门适配的边缘代理函数
 * 1. 隐藏后端真实 IP
 * 2. 详细的错误日志打印 (仅在服务端可见)
 * 3. 边缘运行时支持
 */

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:7860/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const pathArray = (await params).path ?? [];
  const targetPath = pathArray.join('/');
  const queryString = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/${targetPath}${queryString}`;

  const method = req.method;
  const headers = new Headers(req.headers);
  
  // 必须移除 Host 和其他可能导致边缘节点认证失败的头部
  headers.delete('host');
  headers.delete('connection');
  headers.delete('referer');

  try {
    // 处理 Body (如果存在)
    let body: any = null;
    if (method !== 'GET' && method !== 'HEAD') {
      body = await req.blob();
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
    });

    // 处理响应
    const resHeaders = new Headers(response.headers);
    // 强制不缓存 API 响应
    resHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    resHeaders.delete('content-encoding');

    // 如果状态码不是 2xx，打印详细日志
    if (!response.ok) {
      console.error(`--- PROXY BACKEND ERROR [${response.status}] ---`);
      console.error(`URL: ${targetUrl}`);
      console.error(`Message: ${response.statusText}`);
      console.error('--- END ERROR ---');
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: resHeaders,
    });

  } catch (error: any) {
    // 捕获所有异常并打印
    console.error('--- EDGEONE PROXY EXCEPTION ---');
    console.error(`Target: ${targetUrl}`);
    console.error(`Error: ${error?.message || 'Unknown Error'}`);
    console.error(`Stack: ${error?.stack}`);
    console.error('--- END EXCEPTION ---');

    return NextResponse.json(
      { success: false, message: 'EdgeOne Proxy Error', details: error?.message },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
