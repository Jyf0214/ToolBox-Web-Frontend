'use client';

import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button, message, Popconfirm, Card, Typography, Descriptions, Spin } from 'antd';
import { getAuthHeader } from '@/lib/auth';
import { useResponsive } from 'antd-style';
import { StopOutlined, CheckCircleOutlined, DeleteOutlined, AreaChartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface UserItem {
  id?: string | number;
  _id?: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'BANNED';
  createdAt: string;
}

interface UsageStats {
  uploadCount: number;
  convertCount: number;
  loginCount: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [usageLoading, setUsageLoading] = useState<Record<string, boolean>>({});
  const [usageData, setUsageData] = useState<Record<string, UsageStats>>({});
  const { mobile } = useResponsive();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/users', { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch { message.error('加载列表失败'); } finally { setLoading(false); }
  };

  const fetchUsage = async (record: UserItem) => {
    const id = String(record.id || record._id);
    if (usageData[id]) return; // 已加载则跳过

    setUsageLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/proxy/users/${id}/usage`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) setUsageData(prev => ({ ...prev, [id]: data.data }));
    } catch { message.error('用量加载失败'); } finally {
      setUsageLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleStatus = async (record: UserItem) => {
    const id = record.id || record._id;
    try {
      const res = await fetch(`/api/proxy/users/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      if (res.ok) {
        message.success('状态已更新');
        fetchUsers();
      }
    } catch { message.error('操作失败'); }
  };

  const deleteUser = async (id: number | string) => {
    try {
      const res = await fetch(`/api/proxy/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (res.ok) {
        message.success('用户已删除');
        fetchUsers();
      }
    } catch { message.error('删除失败'); }
  };

  const columns = [
    { 
      title: '用户', 
      key: 'user',
      render: (_: unknown, record: UserItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.username}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.email || 'no email'}</Text>
        </Space>
      )
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'BANNED' ? 'error' : 'success'}>
          {status === 'BANNED' ? '已封禁' : '正常'}
        </Tag>
      )
    },
    ...(!mobile ? [{ title: '角色', dataIndex: 'role', key: 'role', render: (r: string) => <Tag color={r === 'ADMIN' ? 'gold' : 'blue'}>{r}</Tag> }] : []),
    {
      title: '操作',
      key: 'action',
      align: 'right' as const,
      render: (_: unknown, record: UserItem) => {
        const isAdmin = record.role === 'ADMIN';
        const id = record.id || record._id || '';
        return (
          <Space size="small">
            <Button 
              type="link" 
              size="small"
              disabled={isAdmin}
              danger={record.status !== 'BANNED'}
              icon={record.status === 'BANNED' ? <CheckCircleOutlined /> : <StopOutlined />}
              onClick={() => toggleStatus(record)}
            >
              {!mobile && (record.status === 'BANNED' ? '解封' : '封禁')}
            </Button>
            <Popconfirm title="确定彻底删除？" disabled={isAdmin} onConfirm={() => deleteUser(id)}>
              <Button type="link" size="small" danger disabled={isAdmin} icon={<DeleteOutlined />}>
                {!mobile && '删除'}
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const expandedRowRender = (record: UserItem) => {
    const id = String(record.id || record._id);
    const stats = usageData[id];

    if (usageLoading[id]) return <div style={{ padding: 16 }}><Spin size="small" /> 正在加载统计...</div>;
    if (!stats) return <div style={{ padding: 16 }}><Button size="small" onClick={() => fetchUsage(record)}>点击加载用量</Button></div>;

    return (
      <Card size="small" title={<Space><AreaChartOutlined /> 详细用量统计</Space>} variant="borderless" style={{ background: '#f9f9f9', margin: '8px 0' }}>
        <Descriptions column={mobile ? 1 : 3} size="small">
          <Descriptions.Item label="转换文档次数">{stats.convertCount} 次</Descriptions.Item>
          <Descriptions.Item label="上传图片数量">{stats.uploadCount} 张</Descriptions.Item>
          <Descriptions.Item label="系统登录次数">{stats.loginCount} 次</Descriptions.Item>
          <Descriptions.Item label="注册时间">{new Date(record.createdAt).toLocaleString()}</Descriptions.Item>
        </Descriptions>
      </Card>
    );
  };

  return (
    <div>
      <Title level={mobile ? 4 : 3} style={{ marginBottom: 24 }}>用户管理</Title>
      <Card variant="borderless" style={{ borderRadius: 12 }} styles={{ body: { padding: mobile ? 0 : 24 } }}>
        <Table 
          columns={columns} 
          dataSource={users} 
          rowKey={(r: UserItem) => String(r.id || r._id)} 
          loading={loading} 
          size={mobile ? 'small' : 'middle'}
          expandable={{
            expandedRowRender,
            onExpand: (expanded, record) => { if (expanded) fetchUsage(record); }
          }}
          pagination={{ size: 'small', hideOnSinglePage: true }}
        />
      </Card>
    </div>
  );
}
