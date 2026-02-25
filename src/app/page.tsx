'use client';

import React from 'react';
import { ConfigProvider, Layout, Typography, Space } from 'antd';
import { FileConverter } from './components/FileConverter';
import { Header } from '@lobehub/ui';
import styled from 'styled-components';

const { Content, Footer } = Layout;
const { Title, Text } = Typography;

const AppContainer = styled.div`
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
`;

const ContentArea = styled(Content)`
  padding: 50px 24px;
  flex: 1;
`;

/**
 * ToolBox-Web 增强主页 (集成 LobeUI/AntD 和文档转换)
 */
export default function Home() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <AppContainer>
        <Header 
          logo={<Title level={4} style={{ margin: 0 }}>ToolBox-Web</Title>}
          nav={[
            <Text key="docs" strong style={{ cursor: 'pointer' }}>文档工具</Text>,
            <Text key="api" strong style={{ cursor: 'pointer', marginLeft: 20 }}>API 状态</Text>
          ]}
        />
        
        <ContentArea>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <Title>一站式文档工具箱</Title>
              <Text type="secondary" style={{ fontSize: 16 }}>
                模块化设计，前后端分离架构，适配 Docker 部署。
              </Text>
            </div>

            <Space direction="vertical" size={50} style={{ width: '100%' }}>
              <FileConverter />
              
              <div style={{ textAlign: 'center' }}>
                <Title level={4}>项目概览</Title>
                <Space wrap size="large" style={{ marginTop: 20 }}>
                  <Text type="secondary">后端: Node.js (7860) + LibreOffice</Text>
                  <Text type="secondary">数据库: MySQL/MongoDB (Prisma/Mongoose)</Text>
                  <Text type="secondary">UI: LobeUI + Ant Design</Text>
                </Space>
              </div>
            </Space>
          </div>
        </ContentArea>

        <Footer style={{ textAlign: 'center' }}>
          ToolBox-Web ©2026 Powered by Jyf0214 | 容器化部署 ghcr.io
        </Footer>
      </AppContainer>
    </ConfigProvider>
  );
}
