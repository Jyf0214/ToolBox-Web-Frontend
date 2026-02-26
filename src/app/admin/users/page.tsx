'use client';

import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button, message, Popconfirm, Card, Typography } from 'antd';
import { getAuthHeader } from '@/lib/auth';
import { useResponsive } from 'antd-style';

const { Title, Text } = Typography;

interface UserItem {
  id?: string | number;
  _id?: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { mobile } = useResponsive();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/users', { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateRole = async (id: number | string, newRole: string) => {
    try {
      const res = await fetch(`/api/proxy/users/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        message.success('角色已更新');
        fetchUsers();
      }
    } catch {
      message.error('更新失败');
    }
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
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    { 
      title: '用户', 
      key: 'user',
      render: (_: unknown, record: UserItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.username}</Text>
          {mobile && <Text type="secondary" style={{ fontSize: 12 }}>{record.email || '无邮箱'}</Text>}
        </Space>
      )
    },
    ...(!mobile ? [{ title: '邮箱', dataIndex: 'email', key: 'email', render: (t: string) => t || '-' }] : []),
    { 
      title: '角色', 
      dataIndex: 'role', 
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'ADMIN' ? 'red' : 'blue'} style={{ borderRadius: 4 }}>{role}</Tag>
      )
    },
    ...(!mobile ? [{ 
      title: '创建时间', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (t: string) => new Date(t).toLocaleString() 
    }] : []),
    {
      title: '操作',
      key: 'action',
      align: 'right' as const,
      render: (_: unknown, record: UserItem) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            onClick={() => updateRole(record.id || record._id || '', record.role === 'ADMIN' ? 'USER' : 'ADMIN')}
          >
            {mobile ? '权' : (record.role === 'ADMIN' ? '降级' : '升级')}
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => deleteUser(record.id || record._id || '')}>
            <Button type="link" size="small" danger>删</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={mobile ? 4 : 3} style={{ marginBottom: mobile ? 16 : 24 }}>用户管理</Title>
      <Card variant="borderless" style={{ borderRadius: 12 }} styles={{ body: { padding: mobile ? 0 : 24 } }}>
        <Table 
          columns={columns} 
          dataSource={users} 
          rowKey={(r: UserItem) => String(r.id || r._id)} 
          loading={loading} 
          size={mobile ? 'small' : 'middle'}
          scroll={mobile ? { x: 400 } : undefined}
          pagination={{ size: 'small' }}
        />
      </Card>
    </div>
  );
}
