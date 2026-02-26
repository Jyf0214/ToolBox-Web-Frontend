'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Layout, Typography, Form, Input, InputNumber, Switch, Card, message, Tabs, Select, Spin, Button } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, ThunderboltOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useResponsive } from 'antd-style';
import { getAuthHeader, getAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import type { Rule } from 'antd/es/form';

const { Content } = Layout;
const { Title } = Typography;

interface ConfigRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

interface ConfigSchemaItem {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'switch' | 'select' | 'multi-select';
  group: string;
  defaultValue: unknown;
  options?: { label: string; value: unknown }[];
  rules?: ConfigRule[];
  placeholder?: string;
  tooltip?: string;
}

export default function AdminSettingsPage() {
  const [form] = Form.useForm();
  const [schema, setSchema] = useState<ConfigSchemaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { mobile } = useResponsive();
  const router = useRouter();
  const auth = getAuth();

  const fetchData = useCallback(async () => {
    if (!auth || auth.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    setLoading(true);
    const headers = getAuthHeader();
    try {
      const schemaRes = await fetch('/api/proxy/config/schema', { headers });
      const schemaData = (await schemaRes.json()) as { success: boolean; data: ConfigSchemaItem[] };
      const configRes = await fetch('/api/proxy/config/all', { headers });
      const configData = (await configRes.json()) as { success: boolean; data: Record<string, unknown> };

      if (schemaData.success && configData.success) {
        setSchema(schemaData.data);
        form.setFieldsValue(configData.data);
      }
    } catch {
      message.error('初始化配置引擎失败');
    } finally {
      setLoading(false);
    }
  }, [router, form, auth]);

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
      if (data.success) message.success('全局配置已更新');
    } catch { message.error('保存失败'); } finally { setSaving(false); }
  };

  const testSmtp = async () => {
    try {
      const values = await form.validateFields();
      setTesting(true);
      const res = await fetch('/api/proxy/config/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(values)
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) message.success('邮件服务连接成功');
      else message.error(data.message || '连接失败');
    } catch { message.error('请检查表单填写'); } finally { setTesting(false); }
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

  const groups = Array.from(new Set(schema.map(s => s.group)));
  const tabItems = groups.map(groupName => ({
    key: groupName,
    label: groupName,
    children: (
      <div style={{ padding: '8px 4px' }}>
        {schema.filter(s => s.group === groupName).map(item => (
          <Form.Item 
            key={item.key} 
            name={item.key} 
            label={item.label} 
            rules={item.rules as Rule[]}
            tooltip={item.tooltip}
            valuePropName={item.type === 'switch' ? 'checked' : 'value'}
          >
            {renderField(item)}
          </Form.Item>
        ))}
        {groupName === '邮件服务' && (
          <Button icon={<ThunderboltOutlined />} onClick={testSmtp} loading={testing} style={{ marginBottom: 24 }}>
            测试连接
          </Button>
        )}
      </div>
    )
  }));

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/"><Button icon={<ArrowLeftOutlined />} type="text" /></Link>
          <Title level={2} style={{ margin: 0 }}>系统配置</Title>
        </div>
        <Form form={form} layout="vertical" onFinish={onSaveSystem}>
          <Card 
            variant="borderless" 
            style={{ borderRadius: 16 }}
            actions={[
              <div key="save" style={{ padding: '0 24px' }}>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} block size="large" style={{ background: '#000' }}>
                  保存所有系统修改
                </Button>
              </div>
            ]}
          >
            <Tabs items={tabItems} tabPosition={mobile ? 'top' : 'left'} style={{ minHeight: 400 }} />
          </Card>
        </Form>
      </Content>
    </Layout>
  );
}
