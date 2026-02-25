import { NextRequest, NextResponse } from 'next/server';

/**
 * 腾讯云 EdgeOne 边缘函数适配 (Edge Runtime)
 * 1. 解决 Node 函数 6MB Payload 限制导致的 413 错误
 * 2. 强制流式转发 (Streaming)，支持大文件下载
 * 3. 保持后端 IP 隐藏
 */

export const runtime = 'edge'; 
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:7860/api';

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, params);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, params);
}

async function handleProxy(req: NextRequest, paramsPromise: Promise<{ path: string[] }>) {
  const { path: pathArray } = await paramsPromise;
  const targetPath = (pathArray ?? []).join('/');
  const queryString = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/${targetPath}${queryString}`;

  // 复制请求头
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  try {
    // 关键：使用 Fetch 的流式特性
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      // @ts-ignore
      duplex: 'half',
      cache: 'no-store'
    });

    // 复制响应头，确保 Content-Disposition 等关键头透传
    const resHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        resHeaders.set(key, value);
      }
    });

    // 解决跨域暴露头问题，确保文件名能被前端识别（如果需要）
    resHeaders.set('Access-Control-Expose-Headers', 'Content-Disposition');
    // 强制不缓存
    resHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    console.log(`[EDGE PROXY] ${req.method} ${targetUrl} -> ${response.status}`);

    // 直接返回 response.body 开启流式传输
    return new NextResponse(response.body, {
      status: response.status,
      headers: resHeaders,
    });

  } catch (error: any) {
    console.error(`[EDGE ERROR] ${targetUrl}:`, error.message);
    return NextResponse.json(
      { success: false, message: '边缘网关转发失败', error: error.message },
      { status: 502 }
    );
  }
}

export const PUT = POST;
export const DELETE = POST;
export const PATCH = POST;
