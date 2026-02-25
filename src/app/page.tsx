'use client';

import React from 'react';
import { ConfigProvider, Layout, Typography, Grid, theme, Button, Space } from 'antd';
import { FileConverter } from './components/FileConverter';
import { Github, FileText } from 'lucide-react';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function Home() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1f1f1f',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
          fontSize: 14,
        },
        components: {
          Button: { controlHeight: 40, paddingContentHorizontal: 24 },
          Layout: { headerBg: '#ffffff', bodyBg: '#f5f7fa' }
        }
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header 
          style={{ 
            padding: isMobile ? '0 16px' : '0 40px',
            borderBottom: '1px solid #eef0f2',
            height: 64,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: '#fff'
          }}
        >
          <Space align="center" size={12}>
            <div style={{ 
              width: 32, height: 32, borderRadius: 6, background: '#000', color: '#fff', 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <FileText size={18} strokeWidth={2.5} />
            </div>
            <Title level={5} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.01em' }}>ToolBox</Title>
          </Space>
          
          <Button 
            type="text" 
            icon={<Github size={18} />} 
            href="https://github.com/Jyf0214/ToolBox-Web" 
            target="_blank"
            style={{ color: '#666' }}
          />
        </Header>
        
        <Content style={{ padding: isMobile ? '24px 16px' : '48px 24px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 720 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
                文档格式转换
              </Title>
              <Text type="secondary" style={{ fontSize: 16, marginTop: 8, display: 'block' }}>
                支持 DOCX 转 PDF，无需登录
              </Text>
            </div>

            <FileConverter />

            <div style={{ marginTop: 48, textAlign: 'center' }}>
              <Space size={isMobile ? 16 : 40} split={<span style={{ color: '#ddd' }}>|</span>}>
                <Text type="secondary">极速处理</Text>
                <Text type="secondary">隐私安全</Text>
                <Text type="secondary">完全免费</Text>
              </Space>
            </div>
          </div>
        </Content>

        <Footer style={{ textAlign: 'center', color: '#999', padding: '24px 0', fontSize: 13 }}>
          © 2026 ToolBox. Open Source Project.
        </Footer>
      </Layout>
    </ConfigProvider>
  );
}
