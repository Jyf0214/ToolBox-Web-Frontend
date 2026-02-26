'use client';

import React, { useState } from 'react';
import { Upload, Button, Card, message, Typography, Space, Progress, List, Switch, Badge, notification, Alert } from 'antd';
import { InboxOutlined, FileTextOutlined, DownloadOutlined, PlayCircleOutlined, DeleteOutlined, FileAddOutlined, FileZipOutlined, CopyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useResponsive } from 'antd-style';
import { v4 as uuidv4 } from 'uuid';

const { Title, Text } = Typography;

const PROXY_PATH = '/api/proxy';
const DIRECT_API_URL = process.env.NEXT_PUBLIC_DIRECT_API_URL || PROXY_PATH;

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

  const showErrorLog = (msg: string, error: unknown, details?: string) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const truncatedDetails = details && details.length > 5000 
      ? details.substring(0, 5000) + '\n... [日志过长已截断]' 
      : details;

    notification.error({
      message: msg,
      title: msg, // 核心修复：添加 title
      description: (
        <div style={{ maxHeight: 200, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>原因:</Text>
            <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 2 }}>{errorMsg}</div>
          </div>
          {truncatedDetails && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>反馈 (RAW):</Text>
              <pre style={{ 
                fontSize: 10, background: '#fafafa', padding: '6px 8px', marginTop: 4, 
                whiteSpace: 'pre-wrap', wordBreak: 'break-all', borderRadius: 4,
                color: '#888', border: '1px solid #f0f0f0', fontFamily: 'monospace'
              }}>
                {truncatedDetails}
              </pre>
            </div>
          )}
        </div>
      ),
      duration: 10,
      placement: 'topRight',
      style: { width: mobile ? '90vw' : 400, padding: '12px 16px' }
    });
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
    const CHUNK_SIZE = 4 * 1024 * 1024;
    const totalChunks = Math.ceil(item.file.size / CHUNK_SIZE);
    const uploadId = uuidv4();
    const MAX_CONCURRENCY = 3;
    const MAX_RETRIES = 3;

    let completedChunks = 0;
    const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i);

    const uploadChunkWithRetry = async (index: number, retryCount = 0): Promise<{ merged?: boolean }> => {
      const start = index * CHUNK_SIZE;
      const end = Math.min(item.file.size, start + CHUNK_SIZE);
      const chunk = item.file.slice(start, end);

      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('uploadId', uploadId);
      formData.append('index', index.toString());
      formData.append('total', totalChunks.toString());
      formData.append('fileName', item.name);
      formData.append('makeEven', String(makeEven));

      try {
        const res = await new Promise<{ merged?: boolean }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.timeout = 60000;
          xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(`HTTP ${xhr.status}`);
          xhr.onerror = () => reject('网络异常');
          xhr.ontimeout = () => reject('请求超时');
          xhr.open('POST', `${PROXY_PATH}/convert/upload-chunk`);
          xhr.send(formData);
        });

        completedChunks++;
        updateFileStatus(item.uid, { progress: Math.floor((completedChunks / totalChunks) * 90), status: 'uploading' });
        return res;
      } catch (err) {
        if (retryCount < MAX_RETRIES) return uploadChunkWithRetry(index, retryCount + 1);
        throw err;
      }
    };

    const pool = new Set<Promise<{ merged?: boolean }>>();
    for (const index of chunkIndices) {
      if (pool.size >= MAX_CONCURRENCY) await Promise.race(pool);
      const task = uploadChunkWithRetry(index);
      pool.add(task);
      task.then(() => pool.delete(task)).catch(() => pool.delete(task));
    }

    try {
      const results = await Promise.all(pool);
      const lastRes = results.find(r => r && r.merged);
      if (lastRes) {
        updateFileStatus(item.uid, { jobId: uploadId, status: 'processing', progress: 95 });
        await pollStatus(item.uid, uploadId);
      }
    } catch (err: unknown) {
      updateFileStatus(item.uid, { status: 'failed', error: '上传失败' });
      showErrorLog(`传输中断: ${item.name}`, err);
    }
  };

  const pollStatus = async (uid: string, jobId: string) => {
    const check = async (): Promise<void> => {
      try {
        const res = await fetch(`${PROXY_PATH}/convert/status/${jobId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { 
          status: string; 
          downloadToken?: string; 
          jobId: string; 
          error?: string; 
          progress?: { total: number; current: number; message: string };
        };

        if (data.status === 'completed') {
          updateFileStatus(uid, { status: 'completed', progress: 100, token: data.downloadToken, jobId: data.jobId });
        } else if (data.status === 'failed') {
          updateFileStatus(uid, { status: 'failed', error: '转换失败' });
          showErrorLog('转换任务异常', data.error);
        } else {
          if (data.progress) updateFileStatus(uid, { subProgress: data.progress });
          setTimeout(check, 1500);
        }
      } catch (err: unknown) {
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
      const url = `${DIRECT_API_URL}/convert/download/${item.jobId}?token=${item.token}`;
      window.open(url, '_blank');
    }
  };

  const copyDownloadUrl = (item: FileItem) => {
    if (item.token && item.jobId) {
      const baseUrl = DIRECT_API_URL.startsWith('http') ? DIRECT_API_URL : window.location.origin + DIRECT_API_URL;
      const fullUrl = `${baseUrl}/convert/download/${item.jobId}?token=${item.token}`;
      navigator.clipboard.writeText(fullUrl).then(() => message.success('链接已复制')).catch(() => message.error('复制失败'));
    }
  };

  const formatSizeLabel = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card variant="borderless" style={{ borderRadius: 16, border: '1px solid #f0f0f0' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space><FileAddOutlined /><Text>开启奇数页补全</Text></Space>
        <Switch checked={makeEven} onChange={setMakeEven} disabled={isProcessing} size="small" />
      </div>

      <Alert
        message="下载建议"
        description="对于超过 4MB 的文件，推荐复制直链使用 IDM/ADM 等多线程工具下载，以避免 Chrome 等浏览器单线程下载可能出现的中断。"
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 20, borderRadius: 8, fontSize: 13 }}
      />

      <Upload.Dragger multiple accept=".docx,.zip" beforeUpload={handleBeforeUpload} showUploadList={false} disabled={isProcessing} style={{ padding: 20, background: '#fafafa', borderRadius: 12 }}>
        <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#000' }} /></p>
        <Title level={5}>上传 DOCX 或 ZIP</Title>
        <Text type="secondary">支持保留压缩包目录结构进行转换</Text>
      </Upload.Dragger>

      {fileList.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Badge count={fileList.length} color="#000" offset={[10, 0]}><Text strong>处理列表</Text></Badge>
            <Space>
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={startAll} loading={isProcessing} disabled={fileList.every(f => f.status !== 'wait')} style={{ background: '#000' }}>启动</Button>
              {fileList.some(f => f.status === 'completed') && (
                <Button icon={<DownloadOutlined />} onClick={() => {
                  fileList.filter(f => f.status === 'completed').forEach((item, index) => setTimeout(() => downloadFile(item), index * 800));
                }}>一键下载</Button>
              )}
              <Button type="text" danger onClick={() => setFileList([])} disabled={isProcessing}>清空</Button>
            </Space>
          </div>
          <List dataSource={fileList} renderItem={(item) => (
            <List.Item actions={[
              item.status === 'completed' && <Space key="actions"><Button type="link" icon={<DownloadOutlined />} onClick={() => downloadFile(item)}>下载</Button><Button type="text" icon={<CopyOutlined />} onClick={() => copyDownloadUrl(item)} title="复制下载链接" /></Space>,
              item.status === 'wait' && <Button key="rm" type="text" danger icon={<DeleteOutlined />} onClick={() => setFileList(prev => prev.filter(f => f.uid !== item.uid))} />
            ]}>
              <List.Item.Meta
                avatar={item.isZip ? <FileZipOutlined style={{ fontSize: 20, color: '#faad14' }} /> : <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                title={<Space><Text strong={item.status === 'completed'}>{item.name}</Text><Text type="secondary" style={{ fontSize: 12 }}>({formatSizeLabel(item.file.size)})</Text></Space>}
                description={<div style={{ marginTop: 4 }}>
                  {item.status === 'failed' ? <Text type="danger">{item.error}</Text> :
                   item.status === 'completed' ? <Text type="success">处理完成</Text> :
                   item.subProgress ? <Space direction="vertical" style={{ width: '100%' }} size={0}><Progress percent={Math.round((item.subProgress.current / item.subProgress.total) * 100)} size="small" strokeColor="#000" /><Text type="secondary" style={{ fontSize: 12 }}>{item.subProgress.message}</Text></Space> : <Progress percent={item.progress} size="small" strokeColor="#000" />
                  }
                </div>}
              />
            </List.Item>
          )} />
        </div>
      )}
    </Card>
  );
};
