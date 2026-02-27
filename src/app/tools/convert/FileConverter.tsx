'use client';

import React, { useState } from 'react';
import { Upload, Button, List, Card, Space, Typography, message, Tag, Tooltip, Alert, Switch } from 'antd';
import { InboxOutlined, FilePdfOutlined, DownloadOutlined, PlayCircleOutlined, DeleteOutlined, CopyOutlined, CheckCircleOutlined, SyncOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface ExtendedFile {
  uid: string;
  name: string;
  size: number;
  originFileObj?: File;
  jobId?: string;
  status: 'wait' | 'uploading' | 'processing' | 'completed' | 'error';
  progress?: number;
  downloadToken?: string;
  outputFileName?: string;
}

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

export default function FileConverter() {
  const [fileList, setFileList] = useState<ExtendedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [makeEven, setMakeEven] = useState(false); // 新增状态

  const formatSize = (bytes: number = 0) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadChunk = async (file: File, uploadId: string, index: number, total: number) => {
    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('uploadId', uploadId);
    formData.append('index', index.toString());
    formData.append('total', total.toString());
    formData.append('fileName', file.name);
    formData.append('makeEven', makeEven.toString()); // 传递参数

    const res = await fetch('/api/proxy/convert/upload-chunk', {
      method: 'POST',
      body: formData,
    });
    return res.json();
  };

  const startAll = async () => {
    const waiting = fileList.filter(f => f.status === 'wait');
    if (waiting.length === 0) return;

    setIsProcessing(true);
    
    for (const fileItem of waiting) {
      const uploadId = uuidv4();
      const file = fileItem.originFileObj as File;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      updateFileStatus(fileItem.uid, { status: 'uploading', progress: 0, jobId: uploadId });

      try {
        for (let i = 0; i < totalChunks; i++) {
          await uploadChunk(file, uploadId, i, totalChunks);
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          updateFileStatus(fileItem.uid, { progress });
        }
        updateFileStatus(fileItem.uid, { status: 'processing' });
        pollStatus(fileItem.uid, uploadId);
      } catch {
        updateFileStatus(fileItem.uid, { status: 'error' });
      }
    }
  };

  const updateFileStatus = (uid: string, updates: Partial<ExtendedFile>) => {
    setFileList(prev => prev.map(f => f.uid === uid ? { ...f, ...updates } : f));
  };

  const pollStatus = async (uid: string, jobId: string) => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/proxy/convert/status/${jobId}`);
        const data = await res.json();

        if (data.status === 'completed') {
          clearInterval(timer);
          updateFileStatus(uid, { 
            status: 'completed', 
            downloadToken: data.downloadToken, 
            outputFileName: data.outputFileName,
            size: data.outputSize
          });
          checkProcessingDone();
        } else if (data.status === 'failed') {
          clearInterval(timer);
          updateFileStatus(uid, { status: 'error' });
          checkProcessingDone();
        }
      } catch {
        clearInterval(timer);
        updateFileStatus(uid, { status: 'error' });
        checkProcessingDone();
      }
    }, 2000);
  };

  const checkProcessingDone = () => {
    setFileList(prev => {
      const stillWorking = prev.some(f => f.status === 'uploading' || f.status === 'processing');
      if (!stillWorking) setIsProcessing(false);
      return prev;
    });
  };

  const downloadFile = (file: ExtendedFile) => {
    if (!file.jobId || !file.downloadToken) return;
    const url = `/api/proxy/convert/download/${file.jobId}?token=${file.downloadToken}`;
    window.open(url, '_blank');
  };

  const copyLink = (file: ExtendedFile) => {
    const directApi = process.env.NEXT_PUBLIC_DIRECT_API_URL || window.location.origin + '/api/proxy';
    const link = `${directApi}/convert/download/${file.jobId}?token=${file.downloadToken}`;
    navigator.clipboard.writeText(link).then(() => message.success('下载直链已复制'));
  };

  const fileListUI = (
    <List
      dataSource={fileList}
      renderItem={(file) => (
        <List.Item
          key={file.uid}
          style={{ padding: '12px 16px', background: '#fff', borderRadius: 8, marginBottom: 8, border: '1px solid #f0f0f0' }}
          actions={[
            file.status === 'completed' && (
              <Space key="ops">
                <Tooltip title="复制直链 (加速重试)"><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyLink(file)} /></Tooltip>
                <Button type="primary" size="small" icon={<DownloadOutlined />} onClick={() => downloadFile(file)}>下载</Button>
              </Space>
            ),
            file.status === 'error' && <Tag key="err" color="error">失败</Tag>,
            !isProcessing && file.status === 'wait' && <Button key="del" type="text" danger icon={<DeleteOutlined />} onClick={() => setFileList(prev => prev.filter(f => f.uid !== file.uid))} />
          ].filter(Boolean)}
        >
          <List.Item.Meta
            avatar={<FilePdfOutlined style={{ fontSize: 24, color: file.status === 'completed' ? '#52c41a' : '#bfbfbf' }} />}
            title={<Text strong ellipsis style={{ maxWidth: 200 }}>{file.name}</Text>}
            description={
              <Space size={4} style={{ fontSize: 12 }}>
                <Text type="secondary">{formatSize(file.size)}</Text>
                {file.status === 'uploading' && <Text type="secondary">· 正在上传 {file.progress}%</Text>}
                {file.status === 'processing' && <Text type="secondary">· 正在转换 <SyncOutlined spin /></Text>}
                {file.status === 'completed' && <Text type="success">· 已完成 <CheckCircleOutlined /></Text>}
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );

  return (
    <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
      <Dragger
        multiple
        showUploadList={false}
        beforeUpload={(file) => {
          const isDocx = file.name.toLowerCase().endsWith('.docx');
          const isZip = file.name.toLowerCase().endsWith('.zip');
          if (!isDocx && !isZip) {
            message.error('仅支持 DOCX 或 ZIP 格式');
            return Upload.LIST_IGNORE;
          }
          const newFile: ExtendedFile = {
            uid: uuidv4(),
            name: file.name,
            size: file.size,
            status: 'wait',
            originFileObj: file
          };
          setFileList(prev => [...prev, newFile]);
          return false;
        }}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#000' }} /></p>
        <p className="ant-upload-text">点击或拖拽文件到此处</p>
        <p className="ant-upload-hint">支持 .docx 或包含 .docx 的 .zip 压缩包</p>
      </Dragger>

      {fileList.length > 0 && (
        <div style={{ marginTop: 24 }}>
          {fileList.some(f => f.status === 'completed') && (
            <Alert
              message="下载建议"
              description="如果您下载的是大文件或下载速度较慢，建议点击图标复制直链并使用多线程下载工具（如 IDM、Motrix）进行下载。"
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
            <Title level={5} style={{ margin: 0 }}>待处理文件 ({fileList.length})</Title>
            <Space>
              {/* PDF 补白页开关 */}
              <div style={{ display: 'flex', alignItems: 'center', marginRight: 8 }}>
                <Text style={{ fontSize: 13, marginRight: 8 }}>奇数页自动补白</Text>
                <Switch size="small" checked={makeEven} onChange={setMakeEven} disabled={isProcessing} />
              </div>

              {!isProcessing && !fileList.every(f => f.status !== 'wait') && (
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={startAll} style={{ background: '#000' }}>启动</Button>
              )}
              {fileList.length > 1 && fileList.some(f => f.status === 'completed') && (
                <Button icon={<DownloadOutlined />} onClick={() => {
                  fileList.filter(f => f.status === 'completed').forEach((item, index) => setTimeout(() => downloadFile(item), index * 800));
                }}>一键下载</Button>
              )}
              <Button type="text" danger onClick={() => setFileList([])} disabled={isProcessing}>清空</Button>
            </Space>
          </div>
          {fileListUI}
        </div>
      )}
    </Card>
  );
}
