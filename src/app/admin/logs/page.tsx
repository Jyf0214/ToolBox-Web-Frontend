'use client';

import React, { useEffect, useState } from 'react';
import { Table, Tag, Card, Typography, message, Tooltip } from 'antd';
import { getAuthHeader } from '@/lib/auth';

const { Title } = Typography;

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
      title: '操作时间', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (t: string) => new Date(t).toLocaleString(),
      width: 180
    },
    { 
      title: '模块', 
      dataIndex: 'module', 
      key: 'module',
      render: (m: string) => <Tag>{m}</Tag>
    },
    { title: '行为', dataIndex: 'action', key: 'action' },
    { 
      title: '操作者', 
      dataIndex: 'user', 
      key: 'user',
      render: (u: { username: string } | null) => u?.username || '系统/游客'
    },
    { title: 'IP 地址', dataIndex: 'ip', key: 'ip' },
    { 
      title: '详情', 
      dataIndex: 'details', 
      key: 'details',
      ellipsis: true,
      render: (d: string) => (
        <Tooltip title={d}>
          <code style={{ fontSize: 12 }}>{d}</code>
        </Tooltip>
      )
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>审计日志</Title>
      <Card variant="borderless" style={{ borderRadius: 12 }}>
        <Table columns={columns} dataSource={logs} rowKey={(r: LogItem) => String(r.id || r._id)} loading={loading} size="small" />
      </Card>
    </div>
  );
}
