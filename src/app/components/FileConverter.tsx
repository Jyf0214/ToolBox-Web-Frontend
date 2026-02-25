'use client';

import React, { useState } from 'react';
import { Upload, Button, Card, message, Typography, Space, Progress } from 'antd';
import { UploadOutlined, FilePdfOutlined, FileWordOutlined } from '@ant-design/icons';
import { DraggablePanel } from '@lobehub/ui';
import styled from 'styled-components';

const { Title, Text } = Typography;

const StyledCard = styled(Card)`
  max-width: 600px;
  margin: 0 auto;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
`;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7860/api';

/**
 * 文件转换组件 (DOCX -> PDF)
 */
export const FileConverter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [percent, setPercent] = useState(0);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setPercent(20);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      setPercent(50);
      const response = await fetch(`${API_BASE_URL}/convert/docx-to-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('转换失败');

      setPercent(90);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name.replace('.docx', '.pdf'));
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setPercent(100);
      message.success('转换成功，已开始下载');
    } catch (error) {
      message.error('转换过程中出错，请检查后端状态');
    } finally {
      setLoading(false);
      setTimeout(() => setPercent(0), 2000);
    }
  };

  return (
    <StyledCard>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={3}>文档格式互转</Title>
          <Text type="secondary">目前支持 DOCX 转换为 PDF (基于 LibreOffice)</Text>
        </div>

        <Upload.Dragger
          accept=".docx"
          beforeUpload={(file) => {
            handleUpload(file);
            return false;
          }}
          showUploadList={false}
          disabled={loading}
        >
          <p className="ant-upload-drag-icon">
            {loading ? <FilePdfOutlined spin style={{ color: '#1677ff' }} /> : <FileWordOutlined style={{ color: '#2b579a' }} />}
          </p>
          <p className="ant-upload-text">点击或拖拽 DOCX 文件到此处进行转换</p>
          <p className="ant-upload-hint">支持单个文件上传，转换完成后将自动下载</p>
        </Upload.Dragger>

        {loading && <Progress percent={percent} status="active" />}
      </Space>
    </StyledCard>
  );
};
