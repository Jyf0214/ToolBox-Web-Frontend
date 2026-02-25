'use client';

import React, { useState } from 'react';
import { Upload, Button, Card, message, Typography, Space, Progress, List, theme, Empty, Switch, Badge, notification } from 'antd';
import { InboxOutlined, FileTextOutlined, DownloadOutlined, PlayCircleOutlined, DeleteOutlined, CheckCircleFilled, CloseCircleFilled, LoadingOutlined, FileAddOutlined, FileZipOutlined } from '@ant-design/icons';
import { useResponsive } from 'antd-style';
import { v4 as uuidv4 } from 'uuid';

const { Title, Text, Paragraph } = Typography;

// 注意：这里不再是 API 路由，而是匹配 next.config.ts 中的 rewrites
const PROXY_PATH = '/api/proxy';

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

  const showErrorLog = (msg: string, error: any, details?: string) => {
    notification.error({
      message: msg,
      description: (
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>错误详情:</Text> {error?.message || String(error) || '未知异常'}
          </div>
          {details && (
            <div>
              <Text strong>服务器响应:</Text>
              <pre style={{ fontSize: 11, background: '#f5f5f5', padding: 8, marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', borderRadius: 4 }}>
                {details}
              </pre>
            </div>
          )}
        </div>
      ),
      duration: 15,
      placement: 'topRight',
      style: { width: mobile ? '100%' : 450 }
    } as any);
  };

  const handleBeforeUpload = (file: File) => {
    const isDocx = file.name.endsWith('.docx');
    const isZip = file.name.endsWith('.zip');
    if (!isDocx && !isZip) {
      message.error(`${file.name} 格式不支持`);
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

  const uploadFile = async (item: FileItem) => {
    const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB per chunk
    const totalChunks = Math.ceil(item.file.size / CHUNK_SIZE);
    const uploadId = uuidv4();

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(item.file.size, start + CHUNK_SIZE);
      const chunk = item.file.slice(start, end);

      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('uploadId', uploadId);
      formData.append('index', i.toString());
      formData.append('total', totalChunks.toString());
      formData.append('fileName', item.name);
      formData.append('makeEven', String(makeEven));

      try {
        const res = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(`HTTP ${xhr.status}`);
          xhr.onerror = () => reject('网络连接失败');
          
          const uploadedPercent = Math.floor(((i + 1) / totalChunks) * 90);
          updateFileStatus(item.uid, { progress: uploadedPercent, status: 'uploading' });

          xhr.open('POST', `${PROXY_PATH}/convert/upload-chunk`);
          xhr.send(formData);
        });

        if (res.merged) {
          updateFileStatus(item.uid, { jobId: uploadId, status: 'processing', progress: 95 });
          await pollStatus(item.uid, uploadId);
        }
      } catch (err) {
        updateFileStatus(item.uid, { status: 'failed', error: '分块上传失败' });
        showErrorLog(`上传异常: ${item.name}`, `分块 ${i+1}/${totalChunks} 失败`, String(err));
        break;
      }
    }
  };

  const pollStatus = async (uid: string, jobId: string) => {
    const check = async (): Promise<void> => {
      try {
        const res = await fetch(`${PROXY_PATH}/convert/status/${jobId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.status === 'completed') {
          updateFileStatus(uid, { 
            status: 'completed', 
            progress: 100, 
            token: data.downloadToken,
            jobId: data.jobId 
          });
        } else if (data.status === 'failed') {
          updateFileStatus(uid, { status: 'failed', error: '转换失败' });
          showErrorLog('转换任务异常', data.error);
        } else {
          if (data.progress) updateFileStatus(uid, { subProgress: data.progress });
          setTimeout(check, 2000);
        }
      } catch (err: any) {
        updateFileStatus(uid, { status: 'failed', error: '查询中断' });
        showErrorLog('状态轮询失败', err);
      }
    };
    return check();
  };

  const updateFileStatus = (uid: string, updates: Partial<FileItem>) => {
    setFileList(prev => prev.map(f => f.uid === uid ? { ...f, ...updates } : f));
  };

  const startAll = async () => {
    setIsProcessing(true);
    const pending = fileList.filter(f => f.status === 'wait');
    for (const item of pending) {
      await uploadFile(item);
    }
    setIsProcessing(false);
  };

  const downloadFile = (item: FileItem) => {
    if (item.token && item.jobId) {
      const url = `${PROXY_PATH}/convert/download/${item.jobId}?token=${item.token}`;
      window.open(url, '_blank');
    }
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
            <Badge count={fileList.length} color="#000" offset={[10, 0]}><Text strong>处理列表</Text></Badge>
            <Space>
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={startAll} loading={isProcessing} disabled={fileList.every(f => f.status !== 'wait')} style={{ background: '#000' }}>启动</Button>
              <Button type="text" danger onClick={() => setFileList([])} disabled={isProcessing}>清空</Button>
            </Space>
          </div>
          <List
            dataSource={fileList}
            renderItem={(item) => (
              <List.Item
                actions={[
                  item.status === 'completed' && <Button key="dl" type="link" icon={<DownloadOutlined />} onClick={() => downloadFile(item)}>下载</Button>,
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
                           <Text type="secondary" style={{ fontSize: 12 }}>{item.subProgress.message}</Text>
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
