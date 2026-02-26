'use client';

import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button, message, Popconfirm, Card, Typography } from 'antd';
import { getAuthHeader } from '@/lib/auth';

const { Title } = Typography;

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
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '邮箱', dataIndex: 'email', key: 'email', render: (t: string) => t || '-' },
    { 
      title: '角色', 
      dataIndex: 'role', 
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'ADMIN' ? 'red' : 'blue'}>{role}</Tag>
      )
    },
    { 
      title: '创建时间', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (t: string) => new Date(t).toLocaleString() 
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: UserItem) => (
        <Space size="middle">
          <Button 
            type="link" 
            onClick={() => updateRole(record.id || record._id || '', record.role === 'ADMIN' ? 'USER' : 'ADMIN')}
          >
            切换为{record.role === 'ADMIN' ? '用户' : '管理员'}
          </Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => deleteUser(record.id || record._id || '')}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>用户管理</Title>
      <Card variant="borderless" style={{ borderRadius: 12 }}>
        <Table columns={columns} dataSource={users} rowKey={(r: UserItem) => String(r.id || r._id)} loading={loading} />
      </Card>
    </div>
  );
}
