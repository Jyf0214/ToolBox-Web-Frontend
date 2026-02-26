'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Typography, Form, Input, Button, Card, message, Breadcrumb, Avatar } from 'antd';
import { UserOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { getAuthHeader, getAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const { Content } = Layout;
const { Title } = Typography;

interface AuthUser {
  username: string;
  role: 'USER' | 'ADMIN';
  avatar?: string;
}

export default function UserSettingsPage() {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    if (!auth) {
      router.push('/auth/login');
      return;
    }
    const user = auth.user as AuthUser;
    form.setFieldsValue({
      username: user.username,
      avatar: user.avatar || ''
    });
  }, [auth, router, form]);

  const onFinish = async (values: { avatar: string }) => {
    setSaving(true);
    try {
      const res = await fetch('/api/proxy/users/profile', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(values)
      });
      const data = (await res.json()) as { success: boolean };
      if (data.success) {
        message.success('个人资料已更新');
        if (auth) {
          const newAuth = { ...auth, user: { ...auth.user, avatar: values.avatar } };
          localStorage.setItem('toolbox_auth_data', JSON.stringify(newAuth));
        }
      }
    } catch {
      message.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  if (!auth) return null;
  const user = auth.user as AuthUser;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: '24px 16px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 24 }}>
          <Breadcrumb items={[{ title: <Link href="/">首页</Link> }, { title: '账户设置' }]} />
        </div>

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/"><Button icon={<ArrowLeftOutlined />} type="text" /></Link>
          <Title level={2} style={{ margin: 0, fontWeight: 800 }}>账户设置</Title>
        </div>

        <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Avatar size={80} icon={<UserOutlined />} src={user.avatar} style={{ backgroundColor: '#000' }} />
            <div style={{ marginTop: 16 }}>
              <Title level={4} style={{ margin: 0 }}>{user.username}</Title>
              <Tag color={user.role === 'ADMIN' ? 'gold' : 'blue'}>{user.role}</Tag>
            </div>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item label="用户名" name="username">
              <Input disabled />
            </Form.Item>
            <Form.Item label="头像 URL" name="avatar" tooltip="支持图片直链地址">
              <Input placeholder="https://example.com/avatar.png" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<SaveOutlined />} 
                loading={saving}
                block
                size="large"
                style={{ background: '#000', borderColor: '#000', height: 48, borderRadius: 8 }}
              >
                保存修改
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
}

function Tag({ color, children }: { color: string, children: React.ReactNode }) {
  return <span style={{ 
    display: 'inline-block', 
    padding: '2px 8px', 
    borderRadius: 4, 
    fontSize: 12, 
    background: color === 'gold' ? '#fff7e6' : '#e6f7ff',
    color: color === 'gold' ? '#faad14' : '#1890ff',
    border: `1px solid ${color === 'gold' ? '#ffe58f' : '#91d5ff'}`,
    marginTop: 8
  }}>{children}</span>;
}
