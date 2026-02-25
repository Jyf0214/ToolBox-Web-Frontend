import { NextRequest, NextResponse } from 'next/server';

/**
 * 通用后端代理接口 (Vercel Function)
 * 目的：隐藏后端真实 URL，记录详细日志
 */

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:7860/api';

// 配置 Route Segment Config (Next.js 15+ 推荐方式)
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const pathArray = (await params).path ?? [];
  const targetPath = pathArray.join('/');
  const queryString = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/${targetPath}${queryString}`;

  const method = req.method;
  const headers = new Headers(req.headers);
  
  // 移除可能引起问题的 Host 头部
  headers.delete('host');
  headers.delete('connection');

  try {
    const body = method !== 'GET' && method !== 'HEAD' ? await req.blob() : undefined;

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
    });

    // 处理响应
    const resHeaders = new Headers(response.headers);
    resHeaders.delete('content-encoding');

    const resBody = await response.blob();
    
    return new NextResponse(resBody, {
      status: response.status,
      headers: resHeaders,
    });

  } catch (error: any) {
    console.error('--- PROXY ERROR LOG START ---');
    console.error(`Target URL: ${targetUrl}`);
    console.error(`Method: ${method}`);
    console.error(`Error Message: ${error?.message}`);
    console.error('--- PROXY ERROR LOG END ---');

    return NextResponse.json(
      { success: false, message: 'Proxy Error', error: error?.message },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
