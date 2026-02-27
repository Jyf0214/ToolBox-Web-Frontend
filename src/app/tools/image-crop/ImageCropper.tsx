'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Button, Card, Space, Typography, message, List, Progress, Alert } from 'antd';
import { ScissorOutlined, DeleteOutlined, PictureOutlined, ExpandOutlined, DownloadOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { getAuthHeader } from '@/lib/auth';
import { useResponsive } from 'antd-style';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface ImageItem {
  uid: string;
  file: File;
  preview: string;
}

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ResultJob {
  jobId: string;
  token: string;
}

export default function ImageCropper() {
  const [imageList, setImageList] = useState<ImageItem[]>([]);
  const [crop, setCrop] = useState<CropData>({ x: 20, y: 20, width: 150, height: 150 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [resultJob, setResultJob] = useState<ResultJob | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { mobile } = useResponsive();

  useEffect(() => {
    return () => imageList.forEach(item => URL.revokeObjectURL(item.preview));
  }, [imageList]);

  const handleStartCrop = async () => {
    if (imageList.length === 0 || !imgRef.current) return;
    setIsProcessing(true);
    setProcessProgress(0);
    setResultJob(null);

    const formData = new FormData();
    const firstImg = imgRef.current;
    
    const scaleX = firstImg.naturalWidth / firstImg.clientWidth;
    const scaleY = firstImg.naturalHeight / firstImg.clientHeight;

    const realCrop = {
      x: Math.round(crop.x * scaleX),
      y: Math.round(crop.y * scaleY),
      width: Math.round(crop.width * scaleX),
      height: Math.round(crop.height * scaleY)
    };

    try {
      for (let i = 0; i < imageList.length; i++) {
        const item = imageList[i];
        const croppedBlob = await processImage(item.file, realCrop);
        formData.append('files', croppedBlob, item.file.name);
        setProcessProgress(Math.round(((i + 1) / imageList.length) * 100));
      }

      const res = await fetch('/api/proxy/image/batch-upload', {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData
      });
      const data = (await res.json()) as { success: boolean; jobId: string; token: string };

      if (data.success) {
        setResultJob({ jobId: data.jobId, token: data.token });
        message.success('批量裁剪并打包成功！');
      }
    } catch {
      message.error('图像处理服务异常');
    } finally {
      setIsProcessing(false);
    }
  };

  const processImage = (file: File, rc: CropData): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = rc.width;
        canvas.height = rc.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context error');
        ctx.drawImage(img, rc.x, rc.y, rc.width, rc.height, 0, 0, rc.width, rc.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(img.src);
          if (blob) resolve(blob); else reject('Blob error');
        }, file.type, 0.9);
      };
      img.onerror = () => reject('Image load error');
    });
  };

  const updateCrop = useCallback((updates: Partial<CropData>) => {
    if (!containerRef.current) return;
    const { width: cw, height: ch } = containerRef.current.getBoundingClientRect();
    setCrop(prev => {
      const next = { ...prev, ...updates };
      next.x = Math.max(0, Math.min(next.x, cw - next.width));
      next.y = Math.max(0, Math.min(next.y, ch - next.height));
      next.width = Math.max(10, Math.min(next.width, cw - next.x));
      next.height = Math.max(10, Math.min(next.height, ch - next.y));
      return next;
    });
  }, []);

  const bindEvents = (onMove: (e: { clientX: number, clientY: number }) => void) => {
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const point = 'touches' in e ? e.touches[0] : e;
      onMove({ clientX: point.clientX, clientY: point.clientY });
    };
    const upHandler = () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', upHandler);
    };
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', upHandler);
  };

  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const point = 'touches' in e ? e.touches[0] : e;
    const startX = point.clientX;
    const startY = point.clientY;
    const startCrop = { ...crop };
    bindEvents((movePoint) => {
      const dx = movePoint.clientX - startX;
      const dy = movePoint.clientY - startY;
      updateCrop({ x: startCrop.x + dx, y: startCrop.y + dy });
    });
  };

  const onResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const point = 'touches' in e ? e.touches[0] : e;
    const startX = point.clientX;
    const startY = point.clientY;
    const startW = crop.width;
    const startH = crop.height;
    bindEvents((movePoint) => {
      const dx = movePoint.clientX - startX;
      const dy = movePoint.clientY - startY;
      updateCrop({ width: startW + dx, height: startH + dy });
    });
  };

  return (
    <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      {imageList.length === 0 ? (
        <Dragger
          multiple
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            setImageList(prev => [...prev, { uid: uuidv4(), file, preview: URL.createObjectURL(file) }]);
            return false;
          }}
        >
          <p className="ant-upload-drag-icon"><PictureOutlined style={{ color: '#000' }} /></p>
          <p className="ant-upload-text">点击或拖拽图片到此处</p>
          <p className="ant-upload-hint">支持批量同步裁剪</p>
        </Dragger>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {resultJob && (
            <Alert
              message="处理完成"
              description="所有图片已按指定区域裁剪并打包。"
              type="success"
              showIcon
              action={
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<DownloadOutlined />}
                  onClick={() => window.open(`/api/proxy/image/download/${resultJob.jobId}?token=${resultJob.token}`, '_blank')}
                  style={{ background: '#52c41a', border: 'none' }}
                >
                  点击下载压缩包
                </Button>
              }
            />
          )}

          <Title level={mobile ? 5 : 4} style={{ margin: 0, textAlign: 'center' }}>裁剪区域预览</Title>
          
          <div 
            ref={containerRef}
            style={{ 
              position: 'relative', 
              display: 'inline-block', 
              alignSelf: 'center', 
              border: '1px solid #f0f0f0', 
              lineHeight: 0,
              maxHeight: mobile ? '50vh' : '60vh',
              maxWidth: '100%',
              overflow: 'hidden',
              touchAction: 'none',
              background: '#f9f9f9',
              borderRadius: 8
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              ref={imgRef}
              src={imageList[0].preview} 
              alt="Crop Source" 
              style={{ maxHeight: mobile ? '50vh' : '60vh', maxWidth: '100%', userSelect: 'none', display: 'block' }}
              draggable={false}
            />
            
            <div 
              onMouseDown={onDragStart}
              onTouchStart={onDragStart}
              style={{
                position: 'absolute',
                left: crop.x,
                top: crop.y,
                width: crop.width,
                height: crop.height,
                border: '2px solid #fff',
                boxShadow: '0 0 0 9000px rgba(0,0,0,0.5)',
                cursor: 'move',
                zIndex: 5,
                boxSizing: 'border-box'
              }}
            >
              <div 
                onMouseDown={onResizeStart}
                onTouchStart={onResizeStart}
                style={{ 
                  position: 'absolute', right: -10, bottom: -10, 
                  width: 24, height: 24, background: '#1890ff', 
                  borderRadius: '50%', cursor: 'nwse-resize',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '3px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                <ExpandOutlined style={{ color: '#fff', fontSize: 10 }} />
              </div>
            </div>
          </div>

          <div style={{ padding: '0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Space direction="vertical" size={0}>
                <Text strong>{imageList.length} 张待处理</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>尺寸: {Math.round(crop.width)}x{Math.round(crop.height)} px</Text>
              </Space>
              <Space>
                <Button size={mobile ? 'middle' : 'large'} onClick={() => { setImageList([]); setResultJob(null); }} icon={<DeleteOutlined />} disabled={isProcessing}>清空</Button>
                <Button 
                  type="primary" 
                  size={mobile ? 'middle' : 'large'} 
                  icon={<ScissorOutlined />} 
                  onClick={handleStartCrop} 
                  loading={isProcessing} 
                  style={{ background: '#000', border: 'none' }}
                >
                  {resultJob ? '重新批量处理' : '批量处理'}
                </Button>
              </Space>
            </div>
            {isProcessing && <Progress percent={processProgress} strokeColor="#000" size="small" />}
          </div>

          {!mobile && (
            <List
              grid={{ gutter: 12, column: 6 }}
              dataSource={imageList}
              renderItem={item => (
                <List.Item style={{ marginBottom: 0 }}>
                  <Card 
                    // eslint-disable-next-line @next/next/no-img-element
                    cover={<img src={item.preview} alt="item" style={{ height: 60, objectFit: 'cover' }} />} 
                    styles={{ body: { display: 'none' } }}
                    style={{ borderRadius: 6, overflow: 'hidden' }}
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      )}
    </Card>
  );
}
