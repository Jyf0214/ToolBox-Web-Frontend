import { NextRequest, NextResponse } from 'next/server';

/**
 * 极速流式代理 (OpenList 核心逻辑复刻)
 * 1. 完美支持 Range 请求 (断点续传/多线程下载)
 * 2. 解决 Chrome 单线程下载大文件被 EdgeOne 截断的问题
 * 3. 边缘运行时高性能透传
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:7860/api';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathArray } = await params;
  const targetPath = (pathArray ?? []).join('/');
  const queryString = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/${targetPath}${queryString}`;

  const method = req.method;

  // 1. 精简并透传关键请求头 (特别是 Range)
  const headers = new Headers();
  const allowedHeaders = ['accept', 'range', 'if-range', 'authorization', 'content-type', 'user-agent'];
  req.headers.forEach((value, key) => {
    if (allowedHeaders.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // 🔐 注入私有通信密钥 (仅服务端可见)
  if (INTERNAL_API_KEY) {
    headers.set('x-internal-api-key', INTERNAL_API_KEY);
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
      body: (method !== 'GET' && method !== 'HEAD') ? req.body : undefined,
      // @ts-expect-error - duplex 是边缘运行时转发 body 所必需的
      duplex: 'half', 
      redirect: 'follow',
      cache: 'no-store'
    };

    const response = await fetch(targetUrl, fetchOptions);

    // 2. 构造响应头 (确保 Range 支持)
    const resHeaders = new Headers();
    const allowedResHeaders = [
      "content-type",
      "content-disposition",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified"
    ];
    
    response.headers.forEach((value, key) => {
      if (allowedResHeaders.includes(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });

    // 显式声明支持 Range，这对于 EdgeOne 不截断至关重要
    resHeaders.set('Accept-Ranges', 'bytes');
    resHeaders.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Range, Content-Length');

    // 3. 直接返回流 (不做任何变换)
    return new NextResponse(response.body, {
      status: response.status,
      headers: resHeaders,
    });

  } catch (error: unknown) {
    console.error(`[PROXY FAIL] ${targetUrl}:`, error);
    return NextResponse.json(
      { success: false, message: '代理连接断开', error: error instanceof Error ? error.message : 'Unknown' },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
