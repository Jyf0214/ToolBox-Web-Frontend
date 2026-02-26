'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Typography, Form, Input, InputNumber, Switch, Button, Card, message, Breadcrumb, Space, Tabs, Select } from 'antd';
import { MailOutlined, SaveOutlined, ArrowLeftOutlined, ThunderboltOutlined, SecurityScanOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useResponsive } from 'antd-style';
import { getAuthHeader } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function SettingsPage() {
  const [smtpForm] = Form.useForm();
  const [accessForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { mobile } = useResponsive();
  const router = useRouter();

  const fetchData = async () => {
    setLoading(true);
    const headers = getAuthHeader();
    try {
      const smtpRes = await fetch('/api/proxy/config/smtp', { headers });
      if (smtpRes.status === 401 || smtpRes.status === 403) {
        router.push('/auth/login');
        return;
      }
      const smtpData = (await smtpRes.json()) as { success: boolean; data?: Record<string, unknown> };
      if (smtpData.success && smtpData.data) smtpForm.setFieldsValue(smtpData.data);

      const accessRes = await fetch('/api/proxy/config/access', { headers });
      const accessData = (await accessRes.json()) as { success: boolean; data?: Record<string, unknown> };
      if (accessData.success && accessData.data) accessForm.setFieldsValue(accessData.data);

    } catch {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSmtp = async (values: unknown) => {
    setSaving(true);
    try {
      const res = await fetch('/api/proxy/config/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(values)
      });
      const data = (await res.json()) as { success: boolean };
      if (data.success) message.success('SMTP 配置已保存');
    } catch {
      message.error('保存失败');
    } finally { setSaving(false); }
  };

  const saveAccess = async (values: unknown) => {
    setSaving(true);
    try {
      const res = await fetch('/api/proxy/config/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(values)
      });
      const data = (await res.json()) as { success: boolean };
      if (data.success) message.success('访问配置已保存');
    } catch {
      message.error('保存失败');
    } finally { setSaving(false); }
  };

  const testConnection = async () => {
    try {
      const values = await smtpForm.validateFields();
      setTesting(true);
      const res = await fetch('/api/proxy/config/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(values)
      });
      const data = (await res.json()) as { success: boolean };
      if (data.success) message.success('连接测试成功');
      else message.error('连接失败');
    } catch { message.error('校验未通过'); } finally { setTesting(false); }
  };

  const tabItems = [
    {
      key: 'access',
      label: <Space><SecurityScanOutlined />访问与额度</Space>,
      children: (
        <Form form={accessForm} layout="vertical" onFinish={saveAccess}>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: '0 32px' }}>
            <Card title="注册控制" size="small" variant="borderless" style={{ background: '#fcfcfc' }}>
              <Form.Item label="允许非管理员注册" name="allow_non_admin_registration" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item label="允许游客访问" name="allow_guest_access" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item label="最大验证用户数" name="max_verified_users" tooltip="达到此数量后自动关闭注册接口">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Card>
            <Card title="额度与单位" size="small" variant="borderless" style={{ background: '#fcfcfc' }}>
              <Form.Item label="免费用户额度" name="free_user_quota">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="游客用户额度" name="guest_user_quota">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="额度单位" name="quota_unit">
                <Select options={[{label:'次数/天', value:'calls/day'}, {label:'MB/天', value:'MB/day'}]} />
              </Form.Item>
            </Card>
          </div>
          <Card title="功能权限白名单" size="small" variant="borderless" style={{ background: '#fcfcfc', marginTop: 24 }}>
            <Form.Item label="游客可用功能" name="guest_feature_whitelist">
              <Select mode="multiple" placeholder="选择功能" options={[{label:'文档转换', value:'convert'}, {label:'Markdown', value:'markdown'}]} />
            </Form.Item>
            <Form.Item label="免费用户可用功能" name="free_tier_features">
              <Select mode="multiple" placeholder="选择功能" options={[{label:'文档转换', value:'convert'}, {label:'Markdown', value:'markdown'}]} />
            </Form.Item>
          </Card>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} block size="large" style={{ background: '#000', marginTop: 24 }}>
            保存访问配置
          </Button>
        </Form>
      )
    },
    {
      key: 'smtp',
      label: <Space><MailOutlined />SMTP 服务</Space>,
      children: (
        <Form form={smtpForm} layout="vertical" onFinish={saveSmtp}>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: '0 24px' }}>
            <Form.Item label="SMTP 服务器" name="host" rules={[{ required: true }]}>
              <Input placeholder="smtp.example.com" />
            </Form.Item>
            <Form.Item label="端口" name="port" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: '0 24px' }}>
            <Form.Item label="账号" name="user" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="密码/授权码" name="pass" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
          </div>
          <Form.Item label="发件人名称" name="from">
            <Input />
          </Form.Item>
          <Form.Item label="SSL 加密" name="secure" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} block size="large" style={{ background: '#000' }}>
              保存 SMTP
            </Button>
            <Button onClick={testConnection} loading={testing} icon={<ThunderboltOutlined />} block size="large">
              测试连接
            </Button>
          </Space>
        </Form>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: '24px 16px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 24 }}><Breadcrumb items={[{ title: <Link href="/">首页</Link> }, { title: '系统设置' }]} /></div>
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/"><Button icon={<ArrowLeftOutlined />} type="text" /></Link>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 800 }}>系统配置</Title>
            <Text type="secondary">全面管理用户访问权限、资源额度及邮件服务</Text>
          </div>
        </div>
        <Card loading={loading} variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <Tabs defaultActiveKey="access" items={tabItems} />
        </Card>
      </Content>
    </Layout>
  );
}
