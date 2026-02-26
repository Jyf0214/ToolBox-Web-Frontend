'use client';

import React, { useEffect, useState } from 'react';
import { ConfigProvider, Layout, Typography, Grid, Card, Space, Button, Dropdown, Avatar, Badge, Tooltip } from 'antd';
import type { MenuProps, BadgeProps } from 'antd';
import { FileText, Github, ChevronRight, FileDown, User, Settings, LogOut, LayoutDashboard, Server } from 'lucide-react';
import { ScissorOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { getAuth, logout, AuthData } from '@/lib/auth';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface AuthUser {
  username: string;
  role: 'USER' | 'ADMIN';
  avatar?: string;
}

interface ServerHealth {
  dbStatus: 'connected' | 'push_failed' | 'disconnected' | 'none';
  dbType: string;
  nodeVersion: string;
  uptime: number;
}

export default function Home() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [health, setHealth] = useState<ServerHealth | null>(null);

  useEffect(() => {
    const data = getAuth();
    if (data) Promise.resolve().then(() => setAuth(data));
    
    fetch('/api/proxy/config/health')
      .then(res => res.json())
      .then(json => { if(json.success) setHealth(json.data); })
      .catch(() => setHealth({ dbStatus: 'disconnected', dbType: 'none', nodeVersion: '', uptime: 0 }));
  }, []);

  const tools = [
    { title: '文档转换', desc: '支持 DOCX 转 PDF，秒级处理', icon: <FileText size={24} />, path: '/tools/convert', color: '#1f1f1f' },
    { title: 'Markdown 转换', desc: '导出为高质量 PDF、DOCX 或 PNG 图片', icon: <FileDown size={24} />, path: '/tools/markdown', color: '#1f1f1f' },
    { title: '图片批量裁剪', desc: '在同一位置裁剪多张图片，纯前端处理', icon: <ScissorOutlined style={{ fontSize: 24 }} />, path: '/tools/image-crop', color: '#1f1f1f' }
  ];

  const userMenuItems: MenuProps['items'] = [
    { key: 'settings', label: <Link href="/settings">账户设置</Link>, icon: <Settings size={14} /> },
    ...(auth?.user.role === 'ADMIN' ? [{ key: 'admin', label: <Link href="/admin/users">管理后台</Link>, icon: <LayoutDashboard size={14} /> }] : []),
    { type: 'divider' },
    { key: 'logout', label: '退出登录', icon: <LogOut size={14} />, danger: true, onClick: () => logout() }
  ];

  const getStatusColor = (): BadgeProps['status'] => {
    if (!health) return 'default';
    if (health.dbStatus === 'connected') return 'success';
    if (health.dbStatus === 'push_failed') return 'warning';
    return 'error';
  };

  const getStatusText = () => {
    if (!health) return '正在检测服务器...';
    if (health.dbStatus === 'connected') return '服务器运行正常';
    if (health.dbStatus === 'push_failed') return '数据库连接正常但同步受限';
    if (health.dbStatus === 'none') return '本地模式 (无数据库)';
    return '数据库连接异常，部分功能不可用';
  };

  const canAuth = health?.dbStatus === 'connected' || health?.dbStatus === 'push_failed' || health?.dbStatus === 'none';

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1f1f1f', borderRadius: 8, fontFamily: "'Inter', -apple-system, sans-serif" } }}>
      <Layout style={{ minHeight: '100vh', background: '#fff' }}>
        <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: isMobile ? '0 16px' : '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <Space size={isMobile ? 8 : 24}>
            <Space>
              <div style={{ width: 32, height: 32, background: '#000', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><FileText size={18} /></div>
              <Title level={5} style={{ margin: 0, fontWeight: 700 }}>ToolBox</Title>
            </Space>
            
            {!isMobile && (
              <Tooltip title={getStatusText()}>
                <Badge status={getStatusColor()} text={<Text type="secondary" style={{ fontSize: 12 }}>{getStatusText()}</Text>} />
              </Tooltip>
            )}
          </Space>
          
          <Space size={isMobile ? 8 : 16}>
            {auth ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Button type="text" style={{ height: 40, padding: '0 8px' }}>
                  <Space>
                    <Avatar size="small" style={{ backgroundColor: '#000' }} icon={<User size={14} />} src={(auth.user as AuthUser).avatar} />
                    {!isMobile && <Text strong>{auth.user.username}</Text>}
                  </Space>
                </Button>
              </Dropdown>
            ) : (
              canAuth && (
                <Link href="/auth/login">
                  <Button type="default" icon={<User size={16} />} style={{ borderRadius: 6 }}>登录</Button>
                </Link>
              )
            )}
            {!isMobile && <Button type="text" icon={<Github size={18} />} href="https://github.com/Jyf0214/ToolBox-Web" target="_blank" style={{ color: '#666' }} />}
          </Space>
        </Header>

        <Content style={{ padding: isMobile ? '40px 16px' : '80px 40px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 48 }}>
              <Title level={1} style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>实用工具集</Title>
              <Text type="secondary" style={{ fontSize: 16 }}>简单、高效、隐私。全站转换功能开放中。</Text>
            </div>

            {isMobile && (
              <div style={{ marginBottom: 24, padding: '8px 12px', background: '#f9f9f9', borderRadius: 8 }}>
                <Space><Server size={14} /><Text type="secondary" style={{ fontSize: 12 }}>{getStatusText()}</Text></Space>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {tools.map((tool) => (
                <Link href={tool.path} key={tool.path} style={{ textDecoration: 'none' }}>
                  <Card hoverable style={{ borderRadius: 12, border: '1px solid #f0f0f0' }} styles={{ body: { padding: 24 } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ color: tool.color, marginBottom: 16 }}>{tool.icon}</div>
                      <ChevronRight size={18} style={{ color: '#e0e0e0' }} />
                    </div>
                    <Title level={4} style={{ margin: '0 0 8px 0' }}>{tool.title}</Title>
                    <Text type="secondary">{tool.desc}</Text>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </Content>
        <Footer style={{ textAlign: 'center', color: '#999', padding: '48px 0', background: '#fff' }}>ToolBox-Web © 2026</Footer>
      </Layout>
    </ConfigProvider>
  );
}
