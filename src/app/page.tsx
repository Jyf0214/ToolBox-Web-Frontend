'use client';

import { useEffect, useState } from 'react';
import { fetchUsers } from '@/lib/api';

/**
 * ToolBox-Web 主页
 */
export default function Home() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const result = await fetchUsers();
      if (result.success) {
        setUsers(result.data);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  return (
    <main className="min-h-screen p-8 bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 border-b pb-6">
          <h1 className="text-4xl font-bold text-blue-600">ToolBox-Web</h1>
          <p className="mt-2 text-gray-600">模块化 API 架构 & 前后端分离示例</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 状态卡片 */}
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">后端连接状态</h2>
            {loading ? (
              <p className="text-yellow-500">正在尝试连接后端 (7860)...</p>
            ) : users.length > 0 ? (
              <div>
                <p className="text-green-500 flex items-center mb-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  已成功获取后端数据
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  {users.map((user: any) => (
                    <li key={user.id}>• {user.name}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-red-500">无法连接到后端或无数据，请检查 DATABASE_URL 及服务端口。</p>
            )}
          </div>

          {/* 模块说明卡片 */}
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">项目特性</h2>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>🚀 后端: Node.js + Prisma/Mongoose</li>
              <li>📦 容器: Docker 一键部署</li>
              <li>⚡ 前端: Next.js (Vercel 适配)</li>
              <li>🔌 灵活: DATABASE_URL 自动切换协议</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
