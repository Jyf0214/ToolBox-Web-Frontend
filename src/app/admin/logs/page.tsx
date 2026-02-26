'use client';

import React, { useEffect, useState } from 'react';
import { Table, Tag, Card, Typography, message, Tooltip, Space } from 'antd';
import { getAuthHeader } from '@/lib/auth';
import { useResponsive } from 'antd-style';

const { Title, Text } = Typography;

interface LogItem {
  id?: string | number;
  _id?: string;
  createdAt: string;
  module: string;
  action: string;
  user?: { username: string };
  ip?: string;
  details?: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { mobile } = useResponsive();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/logs', { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) setLogs(data.data);
    } catch {
      message.error('加载日志失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      title: '时间', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (t: string) => (
        <Text style={{ fontSize: mobile ? 12 : 14 }}>
          {mobile ? new Date(t).toLocaleTimeString() : new Date(t).toLocaleString()}
        </Text>
      ),
      width: mobile ? 100 : 180,
      fixed: 'left' as const
    },
    { 
      title: '操作', 
      key: 'action_meta',
      render: (_: unknown, record: LogItem) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{record.action}</Text>
          <Tag color="default" style={{ fontSize: 10, lineHeight: '16px', marginTop: 2 }}>{record.module}</Tag>
        </Space>
      )
    },
    ...(!mobile ? [
      { 
        title: '操作者', 
        dataIndex: 'user', 
        key: 'user',
        render: (u: { username: string } | null) => u?.username || '系统/游客'
      },
      { title: 'IP 地址', dataIndex: 'ip', key: 'ip' },
    ] : []),
    { 
      title: '详情', 
      dataIndex: 'details', 
      key: 'details',
      ellipsis: true,
      render: (d: string) => (
        <Tooltip title={d} trigger={['click', 'hover']}>
          <code style={{ fontSize: 11, cursor: 'pointer', color: '#1890ff' }}>{mobile ? '点击查看' : d}</code>
        </Tooltip>
      )
    },
  ];

  return (
    <div>
      <Title level={mobile ? 4 : 3} style={{ marginBottom: mobile ? 16 : 24 }}>审计日志</Title>
      <Card variant="borderless" style={{ borderRadius: 12 }} styles={{ body: { padding: mobile ? 8 : 24 } }}>
        <Table 
          columns={columns} 
          dataSource={logs} 
          rowKey={(r: LogItem) => String(r.id || r._id)} 
          loading={loading} 
          size="small" 
          scroll={{ x: mobile ? 500 : undefined }}
          pagination={{ size: 'small', pageSize: mobile ? 10 : 20 }}
        />
      </Card>
    </div>
  );
}
