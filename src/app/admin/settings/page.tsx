'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Typography, Form, Input, InputNumber, Switch, Button, Card, message, Breadcrumb, Space } from 'antd';
import { MailOutlined, SaveOutlined, ArrowLeftOutlined, ThunderboltOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useResponsive } from 'antd-style';
import { getAuthHeader } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { mobile } = useResponsive();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/config/smtp', {
        headers: getAuthHeader()
      });
      
      if (res.status === 401 || res.status === 403) {
        message.error('权限不足，请先登录');
        router.push('/auth/login');
        return;
      }

      const data = await res.json();
      if (data.success && data.data) {
        form.setFieldsValue(data.data);
      }
    } catch (err) {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setSaving(true);
    try {
      const res = await fetch('/api/proxy/config/smtp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      if (data.success) {
        message.success('配置已保存');
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      message.error(`保存失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      const values = await form.validateFields();
      setTesting(true);
      const res = await fetch('/api/proxy/config/test-smtp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      if (data.success) {
        message.success('SMTP 连接测试成功！');
      } else {
        message.error(data.message || '连接失败');
      }
    } catch (err: any) {
      message.error('表单校验未通过或请求错误');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 24 }}>
          <Breadcrumb items={[
            { title: <Link href="/">首页</Link> },
            { title: '系统设置' }
          ]} />
        </div>

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/"><Button icon={<ArrowLeftOutlined style={{ fontSize: 16 }} />} type="text" /></Link>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 800 }}>系统设置</Title>
            <Text type="secondary">管理后端 SMTP 邮件服务配置</Text>
          </div>
        </div>

        <Card 
          loading={loading} 
          variant="borderless" 
          style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
        >
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MailOutlined style={{ fontSize: 20, color: '#1f1f1f' }} />
            <Title level={4} style={{ margin: 0 }}>SMTP 配置</Title>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ port: 465, secure: true }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: '0 24px' }}>
              <Form.Item label="SMTP 服务器" name="host" rules={[{ required: true, message: '请输入服务器地址' }]}>
                <Input placeholder="smtp.example.com" />
              </Form.Item>
              <Form.Item label="端口" name="port" rules={[{ required: true, message: '请输入端口' }]}>
                <InputNumber style={{ width: '100%' }} placeholder="465" />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: '0 24px' }}>
              <Form.Item label="发件人邮箱" name="user" rules={[{ required: true, message: '请输入账号' }]}>
                <Input placeholder="user@example.com" />
              </Form.Item>
              <Form.Item label="授权码/密码" name="pass" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password placeholder="******" />
              </Form.Item>
            </div>

            <Form.Item label="发件人显示名称" name="from">
              <Input placeholder="ToolBox Notifier" />
            </Form.Item>

            <Form.Item label="启用 SSL 加密" name="secure" valuePropName="checked">
              <Switch />
            </Form.Item>

            <div style={{ height: 1, background: '#f0f0f0', width: '100%', margin: '24px 0' }} />

            <Form.Item style={{ marginBottom: 0 }}>
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<SaveOutlined />} 
                  loading={saving}
                  block
                  size="large"
                  style={{ background: '#000', borderColor: '#000' }}
                >
                  保存配置
                </Button>
                <Button 
                  onClick={testConnection} 
                  loading={testing}
                  icon={<ThunderboltOutlined />}
                  block
                  size="large"
                >
                  测试连接
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
}
