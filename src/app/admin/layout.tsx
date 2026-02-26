'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Space, Avatar, Typography } from 'antd';
import { 
  UserOutlined, 
  SettingOutlined, 
  PictureOutlined, 
  HistoryOutlined,
  HomeOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getAuth, logout, AuthData } from '@/lib/auth';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [collapsed, setSiderCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const data = getAuth();
    if (!data || data.user.role !== 'ADMIN') {
      router.push('/auth/login');
    } else {
      Promise.resolve().then(() => setAuth(data));
    }
  }, [router]);

  const menuItems = [
    { key: '/admin/users', icon: <UserOutlined />, label: '用户管理' },
    { key: '/admin/images', icon: <PictureOutlined />, label: '图像管理' },
    { key: '/admin/settings', icon: <SettingOutlined />, label: '系统配置' },
    { key: '/admin/logs', icon: <HistoryOutlined />, label: '审计日志' },
  ];

  if (!auth) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setSiderCollapsed}
        theme="light"
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Text strong style={{ fontSize: 16 }}>ToolBox Admin</Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderRight: 0, marginTop: 16 }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Link href="/">
            <Button icon={<HomeOutlined />} type="text">回到首页</Button>
          </Link>
          
          <Space size="large">
            <Space>
              <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#000' }} />
              <Text strong>{auth.user.username}</Text>
            </Space>
            <Button 
              icon={<LogoutOutlined />} 
              type="text" 
              danger 
              onClick={() => logout()}
            >
              退出
            </Button>
          </Space>
        </Header>
        
        <Content style={{ margin: '24px', minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
