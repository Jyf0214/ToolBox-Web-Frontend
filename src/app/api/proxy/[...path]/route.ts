import { NextRequest, NextResponse } from 'next/server';

/**
 * 极速流式代理 (复刻 OpenList 逻辑)
 * 1. 使用 Edge Runtime 获得最佳流处理性能
 * 2. 严格清洗 Header，防止源站干扰
 * 3. 针对下载请求启用流式透传 (Streaming Proxy)
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:7860/api';

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathArray } = await params;
  const targetPath = (pathArray ?? []).join('/');
  const queryString = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/${targetPath}${queryString}`;

  const method = req.method;

  // 1. 精简请求头 (参考 OpenList)
  const headers = new Headers();
  // 只透传核心头，移除所有可能导致回源失败的头
  const allowedHeaders = ['accept', 'accept-encoding', 'accept-language', 'authorization', 'content-type', 'user-agent', 'range'];
  req.headers.forEach((value, key) => {
    if (allowedHeaders.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // 2. 发起请求
  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
      // @ts-ignore - 仅对非 GET/HEAD 请求附加 body
      body: (method !== 'GET' && method !== 'HEAD') ? req.body : undefined,
      // @ts-ignore
      duplex: 'half', 
      redirect: 'follow',
      cache: 'no-store'
    };

    const response = await fetch(targetUrl, fetchOptions);

    // 3. 处理响应头 (清洗 + 增强)
    const resHeaders = new Headers();
    const allowedResHeaders = [
      "content-type",
      "content-disposition",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "expires",
      "date",
      "etag"
    ];
    
    response.headers.forEach((value, key) => {
      if (allowedResHeaders.includes(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });

    // 解决跨域文件名读取问题
    resHeaders.set('Access-Control-Expose-Headers', 'Content-Disposition');
    // 强制不缓存 API 动态响应，但允许浏览器缓存下载内容
    if (targetPath.includes('download')) {
      resHeaders.delete('Cache-Control'); 
    } else {
      resHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    // 4. 极速流式返回
    return new NextResponse(response.body, {
      status: response.status,
      headers: resHeaders,
    });

  } catch (error: any) {
    console.error(`[PROXY FAIL] ${targetUrl}:`, error);
    return NextResponse.json(
      { success: false, message: '代理请求失败', error: error.message },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
