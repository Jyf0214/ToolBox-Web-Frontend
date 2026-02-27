import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:7860/api';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathArray } = await params;
  const targetPath = (pathArray ?? []).join('/');
  
  // 关键修复：移除可能由中间件或 CDN 附加的冗余 ?path=... 参数
  const searchParams = new URLSearchParams(req.nextUrl.search);
  searchParams.delete('path'); // 彻底干掉这个干扰项
  
  const queryString = searchParams.toString();
  const targetUrl = `${BACKEND_URL}/${targetPath}${queryString ? `?${queryString}` : ''}`;

  const method = req.method;

  const headers = new Headers();
  // 仅透传必要头，避免 Host 等干扰后端路由
  const allowedHeaders = ['accept', 'range', 'authorization', 'content-type'];
  req.headers.forEach((value, key) => {
    if (allowedHeaders.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  if (INTERNAL_API_KEY) {
    headers.set('x-internal-api-key', INTERNAL_API_KEY);
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
      body: (method !== 'GET' && method !== 'HEAD') ? req.body : undefined,
      // @ts-expect-error - duplex is required for streaming body in edge
      duplex: 'half', 
      cache: 'no-store'
    };

    const response = await fetch(targetUrl, fetchOptions);

    const resHeaders = new Headers();
    const allowedResHeaders = ["content-type", "content-disposition", "content-length", "content-range", "accept-ranges"];
    response.headers.forEach((value, key) => {
      if (allowedResHeaders.includes(key.toLowerCase())) resHeaders.set(key, value);
    });

    resHeaders.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Range, Content-Length');

    return new NextResponse(response.body, {
      status: response.status,
      headers: resHeaders,
    });

  } catch (error: unknown) {
    console.error(`[PROXY FAIL] ${targetUrl}:`, error);
    return NextResponse.json({ success: false, message: '后端连接失败' }, { status: 502 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
