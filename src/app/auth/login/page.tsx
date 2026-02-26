'use client';

import React, { useState } from 'react';
import { Layout, Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setAuth } from '@/lib/auth';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: unknown) => {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAuth(data.data);
        message.success('登录成功');
        router.push('/');
        setTimeout(() => window.location.reload(), 100);
      } else {
        throw new Error(data.message || '登录失败');
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <Link href="/">
            <Button icon={<ArrowLeftOutlined />} type="text">返回首页</Button>
          </Link>
        </div>

        <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Title level={3} style={{ margin: 0, fontWeight: 800 }}>欢迎回来</Title>
            <Text type="secondary">登录以管理您的 ToolBox</Text>
          </div>

          <Form name="login" layout="vertical" onFinish={onFinish} autoComplete="off">
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ background: '#000', borderColor: '#000', height: 48, borderRadius: 8 }}>
                登录
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary">还没有账号？</Text>
            <Link href="/auth/register">
              <Button type="link" style={{ padding: '0 4px' }}>立即注册</Button>
            </Link>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
