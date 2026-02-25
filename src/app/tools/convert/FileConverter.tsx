'use client';

import React, { useState } from 'react';
import { Upload, Button, Card, message, Typography, Space, Progress, List, theme, Empty, Switch } from 'antd';
import { InboxOutlined, FileTextOutlined, DownloadOutlined, PlayCircleOutlined, DeleteOutlined, CheckCircleFilled, CloseCircleFilled, LoadingOutlined, FileAddOutlined } from '@ant-design/icons';
import { useResponsive } from 'antd-style';

const { Title, Text } = Typography;
const API_BASE_URL = '/api/proxy';

interface FileItem {
  uid: string;
  name: string;
  file: File;
  status: 'wait' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  jobId?: string;
  token?: string;
  error?: string;
}

export const FileConverter: React.FC = () => {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [makeEven, setMakeEven] = useState(false);
  const { mobile } = useResponsive();
  const { token: antdToken } = theme.useToken();

  const handleBeforeUpload = (file: File) => {
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');
    if (!isDocx) {
      message.error(`${file.name} 不是 DOCX 文件`);
      return false;
    }
    const newItem: FileItem = {
      uid: Math.random().toString(36).substring(7),
      name: file.name,
      file,
      status: 'wait',
      progress: 0,
    };
    setFileList(prev => [...prev, newItem]);
    return false; // 阻止自动上传
  };

  const removeFile = (uid: string) => {
    setFileList(prev => prev.filter(f => f.uid !== uid));
  };

  const uploadFile = (item: FileItem) => {
    return new Promise<void>((resolve) => {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('makeEven', String(makeEven));

      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.floor((event.loaded / event.total) * 90);
          updateFileStatus(item.uid, { progress: percent, status: 'uploading' });
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          updateFileStatus(item.uid, { jobId: data.jobId, status: 'processing', progress: 95 });
          // 开始轮询
          await pollStatus(item.uid, data.jobId);
          resolve();
        } else {
          updateFileStatus(item.uid, { status: 'failed', error: '上传失败' });
          resolve();
        }
      };

      xhr.onerror = () => {
        updateFileStatus(item.uid, { status: 'failed', error: '网络错误' });
        resolve();
      };

      xhr.open('POST', `${API_BASE_URL}/convert/docx-to-pdf`);
      xhr.send(formData);
    });
  };

  const pollStatus = async (uid: string, jobId: string) => {
    let attempts = 0;
    const maxAttempts = 60;

    const check = async (): Promise<void> => {
      attempts++;
      if (attempts > maxAttempts) {
        updateFileStatus(uid, { status: 'failed', error: '转换超时' });
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/convert/status/${jobId}`);
        const data = await res.json();

        if (data.status === 'completed') {
          updateFileStatus(uid, { 
            status: 'completed', 
            progress: 100, 
            token: data.downloadToken,
            jobId: data.jobId 
          });
        } else if (data.status === 'failed') {
          updateFileStatus(uid, { status: 'failed', error: data.error || '服务器错误' });
        } else {
          setTimeout(check, 2000);
        }
      } catch {
        updateFileStatus(uid, { status: 'failed', error: '连接中断' });
      }
    };
    return check();
  };

  const updateFileStatus = (uid: string, updates: Partial<FileItem>) => {
    setFileList(prev => prev.map(f => f.uid === uid ? { ...f, ...updates } : f));
  };

  const startAll = async () => {
    const pending = fileList.filter(f => f.status === 'wait');
    if (pending.length === 0) return;

    setIsProcessing(true);
    for (const item of pending) {
      await uploadFile(item);
    }
    setIsProcessing(false);
  };

  const downloadFile = (item: FileItem) => {
    if (item.token && item.jobId) {
      window.open(`${API_BASE_URL}/convert/download/${item.jobId}?token=${item.token}`, '_blank');
    }
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card variant="borderless" style={{ borderRadius: 16, border: '1px solid #f0f0f0' }}>
        <div style={{ marginBottom: 24, padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            <FileAddOutlined style={{ color: '#8c8c8c' }} />
            <Text>补全偶数页 (奇数页自动追加空白页)</Text>
          </Space>
          <Switch 
            checked={makeEven} 
            onChange={setMakeEven} 
            disabled={isProcessing}
            size="small"
          />
        </div>

        <Upload.Dragger
          multiple
          accept=".docx"
          beforeUpload={handleBeforeUpload}
          showUploadList={false}
          disabled={isProcessing}
          style={{ padding: 24, background: '#fafafa', borderRadius: 12, border: '1px dashed #d9d9d9' }}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1f1f1f' }} /></p>
          <Title level={5}>选择或拖拽多个 DOCX 文件</Title>
          <Text type="secondary">文件将暂时保存在待上传列表</Text>
        </Upload.Dragger>

        {fileList.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text strong>{fileList.length} 个文件已就绪</Text>
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />} 
                  onClick={startAll} 
                  loading={isProcessing}
                  disabled={fileList.every(f => f.status !== 'wait')}
                  style={{ background: '#000', borderColor: '#000' }}
                >
                  开始转换
                </Button>
                <Button type="text" danger onClick={() => setFileList([])} disabled={isProcessing}>清空列表</Button>
              </Space>
            </div>
            
            <List
              dataSource={fileList}
              renderItem={(item) => (
                <List.Item
                  style={{ padding: '16px 0' }}
                  actions={[
                    item.status === 'completed' ? (
                      <Button key="dl" type="link" icon={<DownloadOutlined />} onClick={() => downloadFile(item)}>下载</Button>
                    ) : item.status === 'wait' ? (
                      <Button key="rm" type="text" danger icon={<DeleteOutlined />} onClick={() => removeFile(item.uid)} />
                    ) : null
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      item.status === 'completed' ? <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} /> :
                      item.status === 'failed' ? <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 18 }} /> :
                      item.status === 'wait' ? <FileTextOutlined style={{ color: '#8c8c8c', fontSize: 18 }} /> :
                      <LoadingOutlined style={{ color: '#1890ff', fontSize: 18 }} />
                    }
                    title={<Text strong={item.status === 'completed'}>{item.name}</Text>}
                    description={
                      <div style={{ marginTop: 8 }}>
                        {item.status === 'failed' ? <Text type="danger">{item.error}</Text> :
                         item.status === 'completed' ? <Text type="success">转换成功</Text> :
                         <Progress percent={item.progress} size="small" strokeColor="#1f1f1f" />
                        }
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
        
        {fileList.length === 0 && <Empty description="暂无待处理文件" style={{ padding: '40px 0' }} />}
      </Card>
    </Space>
  );
};
