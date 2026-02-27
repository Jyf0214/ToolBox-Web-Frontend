'use client';

import React, { useEffect, useState } from 'react';
import { Table, Space, Button, message, Popconfirm, Card, Typography, Image, Tag } from 'antd';
import { getAuthHeader } from '@/lib/auth';
import { useResponsive } from 'antd-style';
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface UserInfo {
  username: string;
}

interface ImageItem {
  id?: string | number;
  _id?: string;
  title: string;
  category: string;
  url: string;
  createdAt: string;
  user?: UserInfo;
  userId?: UserInfo;
}

export default function ImagesPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { mobile } = useResponsive();

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/images', { headers: getAuthHeader() });
      const data = (await res.json()) as { success: boolean; data: ImageItem[]; message?: string };
      if (data.success) {
        setImages(data.data);
      } else {
        message.error(data.message || '加载列表失败');
      }
    } catch {
      message.error('请求服务器失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const deleteImage = async (id: number | string) => {
    try {
      const res = await fetch(`/api/proxy/images/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) {
        message.success('已从记录中移除');
        fetchImages();
      } else {
        message.error(data.message || '删除失败');
      }
    } catch {
      message.error('删除请求失败');
    }
  };

  const columns = [
    {
      title: '预览',
      dataIndex: 'url',
      key: 'url',
      width: 80,
      render: (url: string, record: ImageItem) => (
        <Image 
          src={url} 
          width={50} 
          height={50} 
          style={{ objectFit: 'cover', borderRadius: 4 }} 
          fallback="/file.svg" 
          alt={record.title}
        />
      )
    },
    {
      title: '信息',
      key: 'info',
      render: (_: unknown, record: ImageItem) => {
        const creator = record.user?.username || record.userId?.username || 'unknown';
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{record.title}</Text>
            <Space size={4}>
              <Tag>{record.category}</Tag>
              <Text type="secondary" style={{ fontSize: 11 }}>
                by {creator}
              </Text>
            </Space>
          </Space>
        );
      }
    },
    ...(!mobile ? [{
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString()
    }] : []),
    {
      title: '操作',
      key: 'action',
      align: 'right' as const,
      render: (_: unknown, record: ImageItem) => {
        const id = record.id || record._id || '';
        return (
          <Popconfirm title="仅删除记录，不影响原始链接，确定？" onConfirm={() => deleteImage(id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {!mobile && '删除'}
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={mobile ? 4 : 3} style={{ margin: 0 }}>图像管理</Title>
        <Button icon={<ReloadOutlined />} onClick={fetchImages} loading={loading}>刷新</Button>
      </div>
      
      <Card variant="borderless" style={{ borderRadius: 12 }} styles={{ body: { padding: mobile ? 0 : 24 } }}>
        <Table 
          columns={columns} 
          dataSource={images} 
          rowKey={(r: ImageItem) => String(r.id || r._id)} 
          loading={loading} 
          size={mobile ? 'small' : 'middle'}
          pagination={{ size: 'small', hideOnSinglePage: true }}
          locale={{ emptyText: '暂无图像记录' }}
        />
      </Card>
    </div>
  );
}
