'use client';

import React, { useState } from 'react';
import { Upload, Button, Card, message, Typography, Space, Progress, Descriptions } from 'antd';
import { UploadOutlined, FilePdfOutlined, FileWordOutlined, DownloadOutlined } from '@ant-design/icons';
import { DraggablePanel } from '@lobehub/ui';
import styled from 'styled-components';

const { Title, Text } = Typography;

const StyledCard = styled(Card)`
  max-width: 600px;
  margin: 0 auto;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
`;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7860/api';

interface ConvertStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadToken?: string;
  outputFileName?: string;
}

/**
 * 文件转换组件 (DOCX -> PDF)
 * 支持异步转换和 Token 验证下载
 */
export const FileConverter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [convertStatus, setConvertStatus] = useState<ConvertStatus | null>(null);
  const [progress, setProgress] = useState(0);

  const pollStatus = async (jobId: string, maxAttempts = 60) => {
    let attempts = 0;

    const checkStatus = async () => {
      attempts += 1;
      if (attempts > maxAttempts) {
        message.error('转换超时，请重试');
        setLoading(false);
        setProgress(0);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/convert/status/${jobId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          setConvertStatus({
            jobId: data.jobId,
            status: 'completed',
            downloadToken: data.downloadToken,
            outputFileName: data.outputFileName,
          });
          setProgress(100);
          setLoading(false);
          message.success('转换完成，请点击下载');
        } else if (data.status === 'failed') {
          setLoading(false);
          setProgress(0);
          message.error(`转换失败：${data.error || '未知错误'}`);
        } else {
          setProgress((prev) => Math.min(prev + 10, 90));
          setTimeout(checkStatus, 1000);
        }
      } catch (error) {
        console.error('轮询状态失败:', error);
        setLoading(false);
        setProgress(0);
        message.error('查询状态失败');
      }
    };

    checkStatus();
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    setProgress(20);
    setConvertStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setProgress(50);
      const response = await fetch(`${API_BASE_URL}/convert/docx-to-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('提交失败');
      }

      const data = await response.json();
      setProgress(70);

      // 轮询查询状态
      pollStatus(data.jobId);
    } catch (error) {
      message.error('提交失败，请检查后端服务');
      setLoading(false);
      setProgress(0);
    }

    return false; // 阻止默认上传行为
  };

  const handleDownload = () => {
    if (convertStatus?.downloadToken) {
      window.open(`${API_BASE_URL}/convert/download/${convertStatus.jobId}?token=${convertStatus.downloadToken}`, '_blank');
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
          beforeUpload={handleUpload}
          showUploadList={false}
          disabled={loading || !!convertStatus}
        >
          <p className="ant-upload-drag-icon">
            {loading ? (
              <FilePdfOutlined spin style={{ color: '#1677ff' }} />
            ) : (
              <FileWordOutlined style={{ color: '#2b579a' }} />
            )}
          </p>
          <p className="ant-upload-text">点击或拖拽 DOCX 文件到此处进行转换</p>
          <p className="ant-upload-hint">支持单个文件上传，转换完成后可下载</p>
        </Upload.Dragger>

        {(loading || convertStatus) && (
          <Card size="small" title="转换进度">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="状态">
                <Space>
                  {loading ? (
                    <Text type="warning">转换中...</Text>
                  ) : convertStatus?.status === 'completed' ? (
                    <Text type="success">✓ 已完成</Text>
                  ) : (
                    <Text type="danger">✗ 失败</Text>
                  )}
                </Space>
              </Descriptions.Item>
              {convertStatus?.outputFileName && (
                <Descriptions.Item label="文件名">{convertStatus.outputFileName}</Descriptions.Item>
              )}
            </Descriptions>
            <Progress
              percent={progress}
              status={loading ? 'active' : convertStatus?.status === 'completed' ? 'success' : 'exception'}
            />
          </Card>
        )}

        {convertStatus?.status === 'completed' && (
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload} block>
            下载转换后的文件
          </Button>
        )}

        {(convertStatus?.status === 'completed' || convertStatus?.status === 'failed') && (
          <Button
            onClick={() => {
              setConvertStatus(null);
              setProgress(0);
            }}
            block
          >
            转换新文件
          </Button>
        )}
      </Space>
    </StyledCard>
  );
};
