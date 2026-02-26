'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Button, Card, Space, Typography, message, List, Progress } from 'antd';
import { ScissorOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { getAuthHeader } from '@/lib/auth';

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

export default function ImageCropper() {
  const [imageList, setImageList] = useState<ImageItem[]>([]);
  const [crop, setCrop] = useState<CropData>({ x: 50, y: 50, width: 200, height: 200 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    return () => imageList.forEach(item => URL.revokeObjectURL(item.preview));
  }, [imageList]);

  const handleStartCrop = async () => {
    if (imageList.length === 0 || !imgRef.current) return;
    setIsProcessing(true);
    setProcessProgress(0);

    const formData = new FormData();
    const firstImg = imgRef.current;
    
    const scaleX = firstImg.naturalWidth / firstImg.clientWidth;
    const scaleY = firstImg.naturalHeight / firstImg.clientHeight;

    const realCrop = {
      x: crop.x * scaleX,
      y: crop.y * scaleY,
      width: crop.width * scaleX,
      height: crop.height * scaleY
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
        message.success('裁剪并打包成功！');
        window.open(`/api/proxy/image/download/${data.jobId}?token=${data.token}`, '_blank');
      }
    } catch {
      message.error('处理失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const processImage = (file: File, rc: CropData): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = rc.width;
        canvas.height = rc.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, rc.x, rc.y, rc.width, rc.height, 0, 0, rc.width, rc.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(img.src);
          resolve(blob!);
        }, file.type);
      };
    });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const startCrop = { ...crop };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setCrop({
        ...startCrop,
        x: Math.max(0, startCrop.x + dx),
        y: Math.max(0, startCrop.y + dy)
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
      {imageList.length === 0 ? (
        <Dragger
          multiple
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            const item: ImageItem = {
              uid: uuidv4(),
              file,
              preview: URL.createObjectURL(file)
            };
            setImageList(prev => [...prev, item]);
            return false;
          }}
        >
          <p className="ant-upload-drag-icon"><PictureOutlined style={{ color: '#000' }} /></p>
          <p className="ant-upload-text">点击或拖拽多张图片到此处</p>
          <p className="ant-upload-hint">支持批量裁剪：在一个裁剪位同时处理所有图片</p>
        </Dragger>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ position: 'relative', display: 'inline-block', alignSelf: 'center', border: '1px solid #eee', lineHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              ref={imgRef}
              src={imageList[0].preview} 
              alt="裁剪预览" 
              style={{ maxWidth: '100%', maxHeight: 500, userSelect: 'none' }}
            />
            <div 
              onMouseDown={onMouseDown}
              style={{
                position: 'absolute',
                left: crop.x,
                top: crop.y,
                width: crop.width,
                height: crop.height,
                border: '2px dashed #fff',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                cursor: 'move',
                zIndex: 10
              }}
            >
              <div style={{ position: 'absolute', right: -5, bottom: -5, width: 10, height: 10, background: '#fff', cursor: 'nwse-resize' }} 
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startW = crop.width;
                  const startH = crop.height;
                  const onMove = (me: MouseEvent) => {
                    setCrop(prev => ({ ...prev, width: Math.max(10, startW + (me.clientX - startX)), height: Math.max(10, startH + (me.clientY - startY)) }));
                  };
                  const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                  };
                  document.addEventListener('mousemove', onMove);
                  document.addEventListener('mouseup', onUp);
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space direction="vertical" size={0}>
              <Title level={5} style={{ margin: 0 }}>批量处理清单 ({imageList.length} 张)</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>尺寸: {Math.round(crop.width)}x{Math.round(crop.height)}</Text>
            </Space>
            <Space>
              <Button danger icon={<DeleteOutlined />} onClick={() => setImageList([])} disabled={isProcessing}>清空</Button>
              <Button type="primary" icon={<ScissorOutlined />} onClick={handleStartCrop} loading={isProcessing} style={{ background: '#000' }}>
                开始批量裁剪
              </Button>
            </Space>
          </div>

          {isProcessing && <Progress percent={processProgress} strokeColor="#000" />}

          <List
            grid={{ gutter: 16, xs: 2, sm: 3, md: 4 }}
            dataSource={imageList}
            renderItem={item => (
              <List.Item>
                <Card cover={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.preview} alt={item.file.name} style={{ height: 100, objectFit: 'cover' }} />
                } size="small">
                  <Card.Meta title={<Text ellipsis style={{ fontSize: 12 }}>{item.file.name}</Text>} />
                </Card>
              </List.Item>
            )}
          />
        </div>
      )}
    </Card>
  );
}
