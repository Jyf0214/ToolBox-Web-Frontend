'use client';

import React, { useState } from 'react';
import { Upload, Button, Card, message, Typography, Space, Progress, Descriptions, App } from 'antd';
import { DownloadOutlined, InboxOutlined, LoadingOutlined } from '@ant-design/icons';
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
  const { modal, message: msg } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [convertStatus, setConvertStatus] = useState<ConvertStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const { mobile } = useResponsive();

  const pollStatus = async (jobId: string, maxAttempts = 60) => {
    let attempts = 0;
    const checkStatus = async () => {
      attempts += 1;
      if (attempts > maxAttempts) {
        msg.error('转换超时，请重试');
        setLoading(false);
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
          msg.success('转换成功！');
        } else if (data.status === 'failed') {
          setLoading(false);
          msg.error(`转换失败：${data.error || '未知错误'}`);
        } else {
          setProgress((prev) => Math.min(prev + 5, 95));
          setTimeout(checkStatus, 1500);
        }
      } catch {
        setLoading(false);
        msg.error('查询状态失败');
      }
    };
    checkStatus();
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    setProgress(10);
    setConvertStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/convert/docx-to-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('提交失败');
      const data = await response.json();
      pollStatus(data.jobId);
    } catch {
      msg.error('服务连接失败');
      setLoading(false);
      setProgress(0);
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
        borderRadius: 24, 
        boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
        textAlign: 'left'
      }}
    >
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {!loading && !convertStatus && (
          <Upload.Dragger
            accept=".docx"
            beforeUpload={handleUpload}
            showUploadList={false}
            style={{ borderRadius: 16, background: '#fcfcfc', border: '2px dashed #eee' }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: '#1677ff' }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 600 }}>点击或拖拽 DOCX 文件</p>
            <p className="ant-upload-hint">支持 DOCX 转 PDF，处理完成后将自动提供下载</p>
          </Upload.Dragger>
        )}

        {(loading || convertStatus) && (
          <Card 
            styles={{ body: { padding: mobile ? 16 : 24, background: '#f8faff', borderRadius: 16 } }}
            variant="borderless"
          >
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label={<Text type="secondary">当前进度</Text>}>
                {loading ? (
                  <Space><LoadingOutlined style={{ color: '#1677ff' }} /><Text strong>正在转换...</Text></Space>
                ) : (
                  <Text type="success" strong>✓ 转换完成</Text>
                )}
              </Descriptions.Item>
              {convertStatus?.outputFileName && (
                <Descriptions.Item label={<Text type="secondary">输出文件</Text>}>
                  <Text strong ellipsis>{convertStatus.outputFileName}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
            <Progress
              percent={progress}
              status={loading ? 'active' : 'success'}
              showInfo={!mobile}
              style={{ marginTop: 16 }}
            />
          </Card>
        )}

        {convertStatus?.status === 'completed' && (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={handleDownload} 
              block 
              size="large"
              shape="round"
              style={{ height: 48, fontWeight: 600 }}
            >
              下载转换结果
            </Button>
            <Button 
              type="link" 
              onClick={() => { setConvertStatus(null); setProgress(0); }} 
              block
            >
              继续转换其他文件
            </Button>
          </Space>
        )}

        {convertStatus?.status === 'failed' && (
          <Button danger onClick={() => setConvertStatus(null)} block size="large" shape="round">
            重新尝试
          </Button>
        )}
      </Space>
    </Card>
  );
};
