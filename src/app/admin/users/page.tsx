'use client';

import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button, message, Popconfirm, Card, Typography, Descriptions, Spin, Modal, Input } from 'antd';
import { getAuthHeader } from '@/lib/auth';
import { useResponsive } from 'antd-style';
import { StopOutlined, CheckCircleOutlined, DeleteOutlined, AreaChartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface UserItem {
  id?: string | number;
  _id?: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'BANNED';
  banReason?: string;
  createdAt: string;
  avatar?: string;
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
  const [banModalVisible, setBanModalVisible] = useState(false);
  const [currentBanningUser, setCurrentBanningUser] = useState<UserItem | null>(null);
  const [banReason, setBanReason] = useState('');
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
    if (usageData[id]) return;
    setUsageLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/proxy/users/${id}/usage`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) setUsageData(prev => ({ ...prev, [id]: data.data }));
    } catch { message.error('用量加载失败'); } finally { setUsageLoading(prev => ({ ...prev, [id]: false })); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleStatus = async (record: UserItem, reason?: string) => {
    const id = record.id || record._id;
    try {
      const res = await fetch(`/api/proxy/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        message.success('状态已同步');
        setBanModalVisible(false);
        setBanReason('');
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
          <Text type="secondary" style={{ fontSize: 11 }}>{record.email || 'no email'}</Text>
        </Space>
      )
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string, record: UserItem) => (
        <Space direction="vertical" size={0}>
          <Tag color={status === 'BANNED' ? 'error' : 'success'}>
            {status === 'BANNED' ? '已封禁' : '正常'}
          </Tag>
          {status === 'BANNED' && record.banReason && (
            <Text type="danger" style={{ fontSize: 10 }}>理由: {record.banReason}</Text>
          )}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      align: 'right' as const,
      render: (_: unknown, record: UserItem) => {
        const isAdmin = record.role === 'ADMIN';
        return (
          <Space size="small">
            <Button 
              type="link" 
              size="small"
              disabled={isAdmin}
              danger={record.status !== 'BANNED'}
              icon={record.status === 'BANNED' ? <CheckCircleOutlined /> : <StopOutlined />}
              onClick={() => {
                if (record.status === 'BANNED') {
                  handleToggleStatus(record);
                } else {
                  setCurrentBanningUser(record);
                  setBanModalVisible(true);
                }
              }}
            >
              {!mobile && (record.status === 'BANNED' ? '解封' : '封禁')}
            </Button>
            <Popconfirm title="确定彻底删除？" disabled={isAdmin} onConfirm={() => deleteUser(record.id || record._id || '')}>
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
    if (usageLoading[id]) return <div style={{ padding: 16 }}><Spin size="small" /></div>;
    if (!stats) return <div style={{ padding: 16 }}><Button size="small" onClick={() => fetchUsage(record)}>加载统计</Button></div>;

    return (
      <Card size="small" title={<Space><AreaChartOutlined /> 统计</Space>} variant="borderless" style={{ background: '#f9f9f9' }}>
        <Descriptions column={mobile ? 1 : 2} size="small">
          <Descriptions.Item label="文档转换">{stats.convertCount} 次</Descriptions.Item>
          <Descriptions.Item label="登录次数">{stats.loginCount} 次</Descriptions.Item>
          <Descriptions.Item label="注册时间">{new Date(record.createdAt).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="头像链接">
            <Text ellipsis style={{ maxWidth: 200 }}>{record.avatar || '未设置'}</Text>
          </Descriptions.Item>
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

      <Modal
        title="封禁用户"
        open={banModalVisible}
        onOk={() => handleToggleStatus(currentBanningUser!, banReason)}
        onCancel={() => setBanModalVisible(false)}
        okText="确认封禁"
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginBottom: 16 }}>正在封禁用户: <b>{currentBanningUser?.username}</b></div>
        <TextArea 
          placeholder="请输入封禁原因 (用户登录时可见)" 
          rows={4} 
          value={banReason}
          onChange={(e) => setBanReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
