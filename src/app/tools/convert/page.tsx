'use client';

import React from 'react';
import { Layout, Typography, Button, Breadcrumb } from 'antd';
import { FileConverter } from './FileConverter';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function ConvertPage() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 24 }}>
          <Breadcrumb items={[
            { title: <Link href="/">首页</Link> },
            { title: '文档转换' }
          ]} />
        </div>

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/">
            <Button icon={<ArrowLeft size={16} />} type="text" />
          </Link>
          <div>
            <Title level={2} style={{ margin: 0, letterSpacing: '-0.02em' }}>文档转换</Title>
            <Text type="secondary">支持将 DOCX 文件转换为 PDF 格式</Text>
          </div>
        </div>

        <FileConverter />
      </Content>
    </Layout>
  );
}
