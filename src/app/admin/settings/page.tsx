'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Layout, Typography, Input, InputNumber, Switch, Card, message, Breadcrumb, Tabs, Select, Spin, Space, Button } from 'antd';
import { ArrowLeftOutlined, LockOutlined, UnlockOutlined, LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useResponsive } from 'antd-style';
import { getAuthHeader } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const { Content } = Layout;
const { Title, Text } = Typography;

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

/**
 * 单个配置项组件：实现“修改即保存”和“密钥锁定”
 */
const ConfigField: React.FC<{ 
  item: ConfigSchemaItem; 
  initialValue: unknown;
}> = ({ item, initialValue }) => {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(item.type === 'password');
  const [success, setSuccess] = useState(false);

  const triggerSave = async (newValue: unknown) => {
    if (item.type === 'password' && locked && newValue === '********') return;
    
    setLoading(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/proxy/config/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ [item.key]: newValue })
      });
      const data = (await res.json()) as { success: boolean };
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch {
      message.error(`${item.label} 保存失败`);
    } finally {
      setLoading(false);
    }
  };

  const renderControl = () => {
    const commonProps = {
      disabled: loading || locked,
      style: { width: '100%' },
      placeholder: item.placeholder
    };

    switch (item.type) {
      case 'switch':
        return <Switch 
          checked={Boolean(value)} 
          disabled={loading}
          onChange={(val) => { setValue(val); triggerSave(val); }} 
        />;
      case 'number':
        return <InputNumber 
          {...commonProps} 
          value={value as number} 
          onChange={setValue}
          onBlur={() => triggerSave(value)}
        />;
      case 'select':
        return <Select 
          {...commonProps} 
          value={value} 
          options={item.options as { label: string; value: string }[]} 
          onChange={(val) => { setValue(val); triggerSave(val); }} 
        />;
      case 'multi-select':
        return <Select 
          {...commonProps} 
          mode="multiple" 
          value={value as string[]} 
          options={item.options as { label: string; value: string }[]} 
          onChange={(val) => { setValue(val); triggerSave(val); }} 
        />;
      case 'password':
        return (
          <Space.Compact style={{ width: '100%' }}>
            <Input.Password 
              {...commonProps} 
              value={value as string} 
              visibilityToggle={!locked}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => { if(!locked) triggerSave(value); }}
            />
            <Button 
              icon={locked ? <LockOutlined /> : <UnlockOutlined />} 
              onClick={() => {
                if (locked) {
                  setLocked(false);
                  setValue('');
                } else {
                  setLocked(true);
                  setValue('********');
                }
              }}
              title={locked ? "点击解锁以编辑" : "点击锁定"}
            />
          </Space.Compact>
        );
      default:
        return <Input 
          {...commonProps} 
          value={value as string} 
          onChange={(e) => setValue(e.target.value)} 
          onBlur={() => triggerSave(value)}
        />;
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 13 }}>{item.label}</Text>
        <div style={{ fontSize: 12 }}>
          {loading && <Text type="secondary"><LoadingOutlined /> 正在同步...</Text>}
          {success && <Text type="success"><CheckCircleOutlined /> 已保存</Text>}
        </div>
      </div>
      {renderControl()}
      {item.tooltip && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{item.tooltip}</div>}
    </div>
  );
};

export default function DynamicSettingsPage() {
  const [schema, setSchema] = useState<ConfigSchemaItem[]>([]);
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const { mobile } = useResponsive();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const headers = getAuthHeader();
    try {
      const schemaRes = await fetch('/api/proxy/config/schema', { headers });
      if (schemaRes.status === 401 || schemaRes.status === 403) {
        router.push('/auth/login');
        return;
      }
      const schemaData = (await schemaRes.json()) as { success: boolean; data: ConfigSchemaItem[] };
      const configRes = await fetch('/api/proxy/config/all', { headers });
      const configData = (await configRes.json()) as { success: boolean; data: Record<string, unknown> };

      if (schemaData.success && configData.success) {
        setSchema(schemaData.data);
        setConfigValues(configData.data);
      }
    } catch {
      message.error('配置引擎连接失败');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div style={{ padding: 100, textAlign: 'center' }}><Spin tip="加载安全配置中..." /></div>;

  const groups = Array.from(new Set(schema.map(s => s.group)));
  const tabItems = groups.map(groupName => ({
    key: groupName,
    label: groupName,
    children: (
      <div style={{ padding: '16px 8px' }}>
        {schema.filter(s => s.group === groupName).map(item => (
          <ConfigField key={item.key} item={item} initialValue={configValues[item.key]} />
        ))}
      </div>
    )
  }));

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 24 }}><Breadcrumb items={[{ title: <Link href="/">首页</Link> }, { title: '系统设置' }]} /></div>
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/"><Button icon={<ArrowLeftOutlined />} type="text" /></Link>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 800 }}>系统配置</Title>
            <Text type="secondary">修改即保存 · 密钥安全保护</Text>
          </div>
        </div>
        
        <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <Tabs defaultActiveKey={groups[0]} items={tabItems} tabPosition={mobile ? 'top' : 'left'} style={{ minHeight: 400 }} />
        </Card>
      </Content>
    </Layout>
  );
}
