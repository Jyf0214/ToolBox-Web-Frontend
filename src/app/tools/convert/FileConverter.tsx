'use client';

import React, { useState } from 'react';
import { Upload, Button, Card, message, Typography, Space, Progress, Divider, Result } from 'antd';
import { InboxOutlined, FileTextOutlined, DownloadOutlined, RedoOutlined } from '@ant-design/icons';
import { useResponsive } from 'antd-style';

const { Title, Text } = Typography;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7860/api';

interface ConvertStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadToken?: string;
  outputFileName?: string;
}

export const FileConverter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [convertStatus, setConvertStatus] = useState<ConvertStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const { mobile } = useResponsive();

  const reset = () => {
    setLoading(false);
    setConvertStatus(null);
    setProgress(0);
  };

  const pollStatus = async (jobId: string, maxAttempts = 60) => {
    let attempts = 0;
    const checkStatus = async () => {
      attempts += 1;
      if (attempts > maxAttempts) {
        message.error('转换超时');
        reset();
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
          message.success('完成');
        } else if (data.status === 'failed') {
          setLoading(false);
          message.error(`失败: ${data.error}`);
        } else {
          setProgress((prev) => Math.min(prev + 5, 95));
          setTimeout(checkStatus, 1500);
        }
      } catch {
        reset();
      }
    };
    checkStatus();
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    setProgress(10);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_BASE_URL}/convert/docx-to-pdf`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('上传失败');
      const data = await response.json();
      pollStatus(data.jobId);
    } catch {
      message.error('上传失败');
      reset();
    }
    return false;
  };

  const handleDownload = () => {
    if (convertStatus?.downloadToken) {
      window.open(`${API_BASE_URL}/convert/download/${convertStatus.jobId}?token=${convertStatus.downloadToken}`, '_blank');
    }
  };

  return (
    <Card 
      variant="borderless" 
      style={{ 
        width: '100%', 
        borderRadius: 16, 
        background: '#fff', 
        border: '1px solid #f0f0f0',
        padding: mobile ? 24 : 48
      }}
    >
      {!loading && !convertStatus && (
        <Upload.Dragger
          accept=".docx"
          beforeUpload={handleUpload}
          showUploadList={false}
          style={{ 
            background: '#fafafa', 
            border: '2px dashed #e0e0e0', 
            borderRadius: 12, 
            padding: 40 
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: '#1f1f1f' }} />
          </p>
          <p className="ant-upload-text" style={{ fontSize: 18, fontWeight: 600, marginTop: 16 }}>
            把文件拖到这里
          </p>
          <p className="ant-upload-hint" style={{ color: '#888' }}>
            支持 DOCX 格式，最大 50MB
          </p>
        </Upload.Dragger>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Progress type="circle" percent={progress} strokeColor="#1f1f1f" />
          <Title level={5} style={{ marginTop: 24 }}>正在转换...</Title>
        </div>
      )}

      {convertStatus?.status === 'completed' && (
        <Result
          status="success"
          title="转换成功"
          subTitle={convertStatus.outputFileName}
          extra={[
            <Button type="primary" key="download" size="large" icon={<DownloadOutlined />} onClick={handleDownload} style={{ background: '#1f1f1f', borderColor: '#1f1f1f' }}>
              下载文件
            </Button>,
            <Button key="retry" size="large" icon={<RedoOutlined />} onClick={reset}>
              继续转换
            </Button>,
          ]}
        />
      )}
    </Card>
  );
};
