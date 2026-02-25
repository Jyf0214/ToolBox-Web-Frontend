import { NextRequest, NextResponse } from 'next/server';

/**
 * 针对 EdgeOne Pages 深度适配的流式代理函数
 * 解决大文件上传导致的 INTERNAL_NODE_FUNCTION_ERROR
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
  let targetUrl = '';
  try {
    const { path: pathArray } = await paramsPromise;
    const targetPath = (pathArray ?? []).join('/');
    const queryString = req.nextUrl.search;
    targetUrl = `${BACKEND_URL}/${targetPath}${queryString}`;

    const method = req.method;
    
    // 复制 Header，避免直接修改原始请求头
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      if (!['host', 'connection', 'content-length', 'referer'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    // 关键修复：大文件流式转发，避免 req.blob() 导致内存崩溃
    const fetchOptions: RequestInit = {
      method,
      headers,
      cache: 'no-store',
      // @ts-ignore - duplex 是必须的，用于流式转发
      duplex: 'half',
    };

    if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = req.body;
    }

    const response = await fetch(targetUrl, fetchOptions);

    // 复制响应头
    const resHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        resHeaders.set(key, value);
      }
    });
    
    // 强制不缓存
    resHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    return new NextResponse(response.body, {
      status: response.status,
      headers: resHeaders,
    });

  } catch (error: any) {
    console.error('--- EDGEONE PROXY CRASH ---');
    console.error(`URL: ${targetUrl}`);
    console.error(`Error: ${error?.message || 'Unknown'}`);
    console.error('--- END ---');

    return NextResponse.json(
      { 
        success: false, 
        message: 'EdgeOne 代理转发失败', 
        error: error?.message,
        tip: '请检查后端 BACKEND_API_URL 是否正确配置且公网可访问' 
      },
      { status: 502 }
    );
  }
}

// 导出其他必要方法
export const PUT = POST;
export const DELETE = POST;
export const PATCH = POST;
