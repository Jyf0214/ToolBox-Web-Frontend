'use client';

import React from 'react';
import { ConfigProvider, Layout, Typography, Grid, Card, Space, Button } from 'antd';
import { FileText, Github, ChevronRight, FileDown, User, Settings } from 'lucide-react';
import Link from 'next/link';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function Home() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const tools = [
    {
      title: '文档转换',
      desc: '支持 DOCX 转 PDF，秒级处理',
      icon: <FileText size={24} />,
      path: '/tools/convert',
      color: '#1f1f1f'
    },
    {
      title: 'Markdown 转 PDF',
      desc: '标准的 A4 纸张排版，极致精美',
      icon: <FileDown size={24} />,
      path: '/tools/markdown',
      color: '#1f1f1f'
    }
    // 未来可在此添加更多工具
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1f1f1f',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, sans-serif",
        },
        components: {
          Button: {
            textHoverBg: 'rgba(0, 0, 0, 0.04)',
          }
        }
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#fff' }}>
        <Header style={{ 
          background: '#fff', 
          borderBottom: '1px solid #f0f0f0', 
          padding: isMobile ? '0 16px' : '0 40px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <Space>
            <div style={{ width: 32, height: 32, background: '#000', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <FileText size={18} />
            </div>
            <Title level={5} style={{ margin: 0, fontWeight: 700 }}>ToolBox</Title>
          </Space>
          
          <Space size={isMobile ? 8 : 16}>
            <Link href="/admin/settings">
              <Button type="text" icon={<Settings size={18} />} />
            </Link>
            
            <Link href="/auth/login">
              <Button type="default" icon={<User size={16} />} style={{ borderRadius: 6 }}>
                登录
              </Button>
            </Link>

            {!isMobile && (
              <Button 
                type="text" 
                icon={<Github size={18} />} 
                href="https://github.com/Jyf0214/ToolBox-Web" 
                target="_blank"
                style={{ color: '#666' }}
              />
            )}
          </Space>
        </Header>

        <Content style={{ padding: isMobile ? '40px 16px' : '80px 40px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 48 }}>
              <Title level={1} style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
                实用工具集
              </Title>
              <Text type="secondary" style={{ fontSize: 16 }}>
                简单、高效、隐私。所有工具均无需登录，即开即用。
              </Text>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: 24 
            }}>
              {tools.map((tool) => (
                <Link href={tool.path} key={tool.path} style={{ textDecoration: 'none' }}>
                  <Card 
                    hoverable 
                    style={{ borderRadius: 12, border: '1px solid #f0f0f0', transition: 'all 0.3s' }}
                    styles={{ body: { padding: 24 } }}
                  >
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

        <Footer style={{ textAlign: 'center', color: '#999', padding: '48px 0', background: '#fff' }}>
          ToolBox-Web © 2026
        </Footer>
      </Layout>
    </ConfigProvider>
  );
}
