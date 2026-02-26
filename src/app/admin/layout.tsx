'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Space, Avatar, Typography, Drawer } from 'antd';
import { 
  UserOutlined, 
  SettingOutlined, 
  PictureOutlined, 
  HistoryOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useResponsive } from 'antd-style';
import { getAuth, logout, AuthData } from '@/lib/auth';
import type { MenuProps } from 'antd';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [collapsed, setSiderCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { mobile } = useResponsive();
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

  const menuItems: MenuProps['items'] = [
    { key: '/admin/users', icon: <UserOutlined />, label: '用户管理' },
    { key: '/admin/images', icon: <PictureOutlined />, label: '图像管理' },
    { key: '/admin/settings', icon: <SettingOutlined />, label: '系统配置' },
    { key: '/admin/logs', icon: <HistoryOutlined />, label: '审计日志' },
  ];

  const handleMenuClick = (key: string) => {
    router.push(key);
    if (mobile) setDrawerVisible(false);
  };

  if (!auth) return null;

  const SidebarContent = (
    <>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
        <Text strong style={{ fontSize: 16 }}>ToolBox Admin</Text>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
        style={{ borderRight: 0, marginTop: 16 }}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* 桌面端侧边栏 */}
      {!mobile && (
        <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={setSiderCollapsed}
          theme="light"
          style={{ borderRight: '1px solid #f0f0f0', position: 'fixed', height: '100vh', left: 0, zIndex: 100 }}
        >
          {SidebarContent}
        </Sider>
      )}

      {/* 移动端抽屉导航 */}
      {mobile && (
        <Drawer
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={250}
          styles={{ body: { padding: 0 } }}
          closable={false}
        >
          {SidebarContent}
        </Drawer>
      )}
      
      <Layout style={{ marginLeft: mobile ? 0 : (collapsed ? 80 : 200), transition: 'margin-left 0.2s' }}>
        <Header style={{ 
          background: '#fff', 
          padding: mobile ? '0 16px' : '0 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          height: 64
        }}>
          <Space>
            {mobile && (
              <Button 
                type="text" 
                icon={<MenuOutlined />} 
                onClick={() => setDrawerVisible(true)} 
                style={{ fontSize: 18 }}
              />
            )}
            <Link href="/">
              <Button icon={<HomeOutlined />} type="text">{!mobile && '首页'}</Button>
            </Link>
          </Space>
          
          <Space size={mobile ? 'small' : 'large'}>
            <Space size={4}>
              <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#000' }} />
              {!mobile && <Text strong>{auth.user.username}</Text>}
            </Space>
            <Button 
              icon={<LogoutOutlined />} 
              type="text" 
              danger 
              onClick={() => logout()}
            >
              {!mobile && '退出'}
            </Button>
          </Space>
        </Header>
        
        <Content style={{ 
          padding: mobile ? '16px' : '24px', 
          minHeight: 280,
          overflowX: 'hidden'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
