'use client';

import React, { useState } from 'react';
import { Upload, Button, Card, message, Typography, Space, Progress, List, theme, Empty, Switch, Badge } from 'antd';
import { InboxOutlined, FileTextOutlined, DownloadOutlined, PlayCircleOutlined, DeleteOutlined, CheckCircleFilled, CloseCircleFilled, LoadingOutlined, FileAddOutlined, FileZipOutlined } from '@ant-design/icons';
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
  isZip: boolean;
  subProgress?: {
    total: number;
    current: number;
    message: string;
  };
}

export const FileConverter: React.FC = () => {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [makeEven, setMakeEven] = useState(false);
  const { mobile } = useResponsive();

  const handleBeforeUpload = (file: File) => {
    const isDocx = file.name.endsWith('.docx');
    const isZip = file.name.endsWith('.zip');
    
    if (!isDocx && !isZip) {
      message.error(`${file.name} 格式不支持 (仅支持 .docx 或 .zip)`);
      return false;
    }
    
    const newItem: FileItem = {
      uid: Math.random().toString(36).substring(7),
      name: file.name,
      file,
      status: 'wait',
      progress: 0,
      isZip,
    };
    setFileList(prev => [...prev, newItem]);
    return false;
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
          await pollStatus(item.uid, data.jobId);
          resolve();
        } else {
          let errorMsg = '上传失败';
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMsg = errorData.message || errorData.error || errorMsg;
          } catch {
            errorMsg = `${xhr.status}: ${xhr.statusText || '上传失败'}`;
          }
          console.error(`[Upload] ${item.name} failed:`, xhr.status, xhr.responseText);
          updateFileStatus(item.uid, { status: 'failed', error: errorMsg });
          resolve();
        }
      };

      xhr.onerror = () => {
        console.error(`[Upload] ${item.name} connection error`);
        updateFileStatus(item.uid, { status: 'failed', error: '连接错误' });
        resolve();
      };

      xhr.open('POST', `${API_BASE_URL}/convert/docx-to-pdf`);
      xhr.send(formData);
    });
  };

  const pollStatus = async (uid: string, jobId: string) => {
    const check = async (): Promise<void> => {
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
          updateFileStatus(uid, { status: 'failed', error: data.error });
        } else {
          if (data.progress) {
            updateFileStatus(uid, { subProgress: data.progress });
          }
          setTimeout(check, 1500);
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

  return (
    <Card variant="borderless" style={{ borderRadius: 16, border: '1px solid #f0f0f0' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space><FileAddOutlined /><Text>开启奇数页补全</Text></Space>
        <Switch checked={makeEven} onChange={setMakeEven} disabled={isProcessing} size="small" />
      </div>

      <Upload.Dragger
        multiple
        accept=".docx,.zip"
        beforeUpload={handleBeforeUpload}
        showUploadList={false}
        disabled={isProcessing}
        style={{ padding: 20, background: '#fafafa', borderRadius: 12 }}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#000' }} /></p>
        <Title level={5}>上传 DOCX 或 ZIP 压缩包</Title>
        <Text type="secondary">支持保留压缩包目录结构进行转换</Text>
      </Upload.Dragger>

      {fileList.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Badge count={fileList.length} color="#000" offset={[10, 0]}><Text strong>待处理队列</Text></Badge>
            <Space>
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={startAll} loading={isProcessing} disabled={fileList.every(f => f.status !== 'wait')} style={{ background: '#000' }}>
                启动
              </Button>
              <Button type="text" danger onClick={() => setFileList([])} disabled={isProcessing}>清空</Button>
            </Space>
          </div>
          
          <List
            dataSource={fileList}
            renderItem={(item) => (
              <List.Item
                actions={[
                  item.status === 'completed' && (
                    <Button key="dl" type="link" icon={<DownloadOutlined />} onClick={() => window.open(`${API_BASE_URL}/convert/download/${item.jobId}?token=${item.token}`)}>下载</Button>
                  ),
                  item.status === 'wait' && <Button key="rm" type="text" danger icon={<DeleteOutlined />} onClick={() => setFileList(prev => prev.filter(f => f.uid !== item.uid))} />
                ].filter(Boolean) as React.ReactNode[]}
              >
                <List.Item.Meta
                  avatar={item.isZip ? <FileZipOutlined style={{ fontSize: 20, color: '#faad14' }} /> : <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                  title={<Text strong={item.status === 'completed'}>{item.name}</Text>}
                  description={
                    <div style={{ marginTop: 4 }}>
                      {item.status === 'failed' ? <Text type="danger">{item.error}</Text> :
                       item.status === 'completed' ? <Text type="success">处理完成</Text> :
                       item.subProgress ? (
                         <Space direction="vertical" style={{ width: '100%' }} size={0}>
                           <Progress percent={Math.round((item.subProgress.current / item.subProgress.total) * 100)} size="small" strokeColor="#000" />
                           <Text type="secondary" style={{ fontSize: 12 }}>{item.subProgress.message} ({item.subProgress.current}/{item.subProgress.total})</Text>
                         </Space>
                       ) : <Progress percent={item.progress} size="small" strokeColor="#000" />
                      }
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )}
    </Card>
  );
};
