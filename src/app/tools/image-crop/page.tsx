'use client';

import React from 'react';
import { Layout, Typography, Button, Breadcrumb } from 'antd';
import ImageCropper from './ImageCropper';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function ImageCropPage() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: '24px 16px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 24 }}>
          <Breadcrumb items={[
            { title: <Link href="/">首页</Link> },
            { title: '图片批量裁剪' }
          ]} />
        </div>

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/"><Button icon={<ArrowLeft size={16} />} type="text" /></Link>
          <div>
            <Title level={2} style={{ margin: 0 }}>图片批量裁剪</Title>
            <Text type="secondary">在同一位置批量裁剪多张图片，纯前端处理，后端打包</Text>
          </div>
        </div>

        <ImageCropper />
      </Content>
    </Layout>
  );
}
