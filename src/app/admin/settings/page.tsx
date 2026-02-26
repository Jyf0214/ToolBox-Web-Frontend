'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Layout, Typography, Form, Input, InputNumber, Switch, Card, message, Tabs, Select, Spin, Button } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { getAuthHeader, getAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const { Content } = Layout;
const { Title } = Typography;

interface ConfigSchemaItem {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'switch' | 'select' | 'multi-select';
  group: string;
  defaultValue: unknown;
  options?: { label: string; value: unknown }[];
  rules?: unknown[];
  placeholder?: string;
  tooltip?: string;
}

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [schema, setSchema] = useState<ConfigSchemaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const auth = getAuth();

  const fetchData = useCallback(async () => {
    if (!auth) {
      router.push('/auth/login');
      return;
    }

    setLoading(true);
    const headers = getAuthHeader();
    try {
      if (auth.user.role === 'ADMIN') {
        const schemaRes = await fetch('/api/proxy/config/schema', { headers });
        const schemaData = (await schemaRes.json()) as { success: boolean; data: ConfigSchemaItem[] };
        const configRes = await fetch('/api/proxy/config/all', { headers });
        const configData = (await configRes.json()) as { success: boolean; data: Record<string, unknown> };

        if (schemaData.success && configData.success) {
          setSchema(schemaData.data);
          form.setFieldsValue(configData.data);
        }
      }
      profileForm.setFieldsValue({ username: auth.user.username });
    } catch {
      message.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  }, [router, form, profileForm, auth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onSaveSystem = async (values: unknown) => {
    setSaving(true);
    try {
      const res = await fetch('/api/proxy/config/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(values)
      });
      const data = (await res.json()) as { success: boolean };
      if (data.success) message.success('系统配置已更新');
    } catch { message.error('保存失败'); } finally { setSaving(false); }
  };

  const onUpdateProfile = async (values: unknown) => {
    setSaving(true);
    try {
      const res = await fetch('/api/proxy/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(values)
      });
      const data = (await res.json()) as { success: boolean };
      if (data.success) message.success('个人资料已更新');
    } catch { message.error('更新失败'); } finally { setSaving(false); }
  };

  const renderField = (item: ConfigSchemaItem) => {
    const options = (item.options || []) as { label: string; value: string }[];
    switch (item.type) {
      case 'switch': return <Switch />;
      case 'number': return <InputNumber style={{ width: '100%' }} />;
      case 'password': return <Input.Password placeholder="********" />;
      case 'select': return <Select options={options} />;
      case 'multi-select': return <Select mode="multiple" options={options} />;
      default: return <Input placeholder={item.placeholder} />;
    }
  };

  if (loading) return <div style={{ padding: 100, textAlign: 'center' }}><Spin /></div>;

  const systemGroups = Array.from(new Set(schema.map(s => s.group)));
  
  const tabItems = [
    {
      key: 'profile',
      label: '个人设置',
      children: (
        <Form form={profileForm} layout="vertical" onFinish={onUpdateProfile} style={{ maxWidth: 400 }}>
          <Form.Item label="用户名" name="username">
            <Input disabled />
          </Form.Item>
          <Form.Item label="头像 URL" name="avatarUrl">
            <Input placeholder="https://example.com/avatar.png" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} style={{ background: '#000' }}>
            更新资料
          </Button>
        </Form>
      )
    },
    ...(auth?.user.role === 'ADMIN' ? [{
      key: 'system',
      label: '系统配置',
      children: (
        <Form form={form} layout="vertical" onFinish={onSaveSystem}>
          {systemGroups.map(group => (
            <Card key={group} title={group} size="small" variant="borderless" style={{ background: '#fcfcfc', marginBottom: 16 }}>
              {schema.filter(s => s.group === group).map(item => (
                <Form.Item key={item.key} name={item.key} label={item.label} valuePropName={item.type === 'switch' ? 'checked' : 'value'}>
                  {renderField(item)}
                </Form.Item>
              ))}
            </Card>
          ))}
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} block size="large" style={{ background: '#000' }}>
            保存所有系统修改
          </Button>
        </Form>
      )
    }] : [])
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/"><Button icon={<ArrowLeftOutlined />} type="text" /></Link>
          <Title level={2} style={{ margin: 0 }}>设置</Title>
        </div>
        <Card variant="borderless" style={{ borderRadius: 16 }}>
          <Tabs items={tabItems} />
        </Card>
      </Content>
    </Layout>
  );
}
