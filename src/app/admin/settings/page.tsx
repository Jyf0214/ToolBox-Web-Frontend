'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Layout, Typography, Input, InputNumber, Switch, Card, message, Tabs, Select, Spin, Space, Button } from 'antd';
import { ArrowLeftOutlined, LockOutlined, UnlockOutlined, LoadingOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useResponsive } from 'antd-style';
import { getAuthHeader, getAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const { Content } = Layout;
const { Title, Text } = Typography;

interface ConfigSchemaItem {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'switch' | 'select' | 'multi-select';
  group: string;
  options?: { label: string; value: string | number }[];
  placeholder?: string;
  tooltip?: string;
}

const LOCAL_SYSTEM_CONFIG_SCHEMA: ConfigSchemaItem[] = [
  { key: 'allow_non_admin_registration', label: '开放用户注册', type: 'switch', group: '访问控制' },
  { key: 'allow_guest_access', label: '允许游客使用', type: 'switch', group: '访问控制' },
  { key: 'max_verified_users', label: '最大注册用户数', type: 'number', group: '访问控制' },
  { 
    key: 'allowed_email_domains', label: '允许的邮箱域名', type: 'multi-select', group: '访问控制', 
    options: [{ label: 'gmail.com', value: 'gmail.com' }, { label: 'outlook.com', value: 'outlook.com' }, { label: 'qq.com', value: 'qq.com' }, { label: '163.com', value: '163.com' }],
    tooltip: '留空允许所有'
  },
  { key: 'allow_email_alias', label: '允许邮箱别名 (+)', type: 'switch', group: '访问控制' },
  { key: 'enforce_qq_numeric_only', label: 'QQ 邮箱强制纯数字', type: 'switch', group: '访问控制' },
  { key: 'reserved_usernames', label: '保留用户名', type: 'multi-select', group: '访问控制', options: [{ label: 'admin', value: 'admin' }, { label: 'system', value: 'system' }] },
  { key: 'smtp_host', label: 'SMTP 服务器', type: 'text', group: '邮件服务', placeholder: 'smtp.gmail.com' },
  { key: 'smtp_port', label: '端口', type: 'number', group: '邮件服务' },
  { key: 'smtp_user', label: '发件账号', type: 'text', group: '邮件服务' },
  { key: 'smtp_pass', label: '授权码/密码', type: 'password', group: '邮件服务' },
  { key: 'smtp_secure', label: '启用 SSL', type: 'switch', group: '邮件服务' },
  { key: 'free_user_quota', label: '免费用户额度', type: 'number', group: '额度管理' },
  { key: 'guest_user_quota', label: '游客用户额度', type: 'number', group: '额度管理' },
  { key: 'quota_unit', label: '额度单位', type: 'select', group: '额度管理', options: [{ label: '次数/天', value: 'calls/day' }] },
  { key: 'guest_features', label: '游客可用功能', type: 'multi-select', group: '功能权限', options: [{ label: '文档转换', value: 'convert' }] },
  { key: 'free_features', label: '免费用户功能', type: 'multi-select', group: '功能权限', options: [{ label: '文档转换', value: 'convert' }] }
];

const ConfigField: React.FC<{ 
  item: ConfigSchemaItem; 
  initialValue: unknown;
}> = ({ item, initialValue }) => {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(item.type === 'password');
  const [success, setSuccess] = useState(false);

  // 仅在初次加载或外部真正更新时同步
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

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
    } catch { message.error(`${item.label} 保存失败`); } finally { setLoading(false); }
  };

  const renderControl = () => {
    const commonProps = { disabled: loading || locked, style: { width: '100%' }, placeholder: item.placeholder };
    switch (item.type) {
      case 'switch': return <Switch checked={!!value} disabled={loading} onChange={(val) => { setValue(val); triggerSave(val); }} />;
      case 'number': return <InputNumber {...commonProps} value={value as number} onChange={(val) => setValue(val)} onBlur={() => triggerSave(value)} />;
      case 'select': return <Select {...commonProps} value={value as string} options={item.options} onChange={(val) => { setValue(val); triggerSave(val); }} />;
      case 'multi-select': return <Select {...commonProps} mode="multiple" value={value as string[]} options={item.options} onChange={(val) => { setValue(val); triggerSave(val); }} />;
      case 'password': return (
        <Space.Compact style={{ width: '100%' }}>
          <Input.Password {...commonProps} value={value as string} visibilityToggle={!locked} onChange={(e) => setValue(e.target.value)} onBlur={() => { if(!locked) triggerSave(value); }} />
          <Button icon={locked ? <LockOutlined /> : <UnlockOutlined />} onClick={() => { if(locked){ setLocked(false); setValue(''); } else { setLocked(true); setValue('********'); }}} />
        </Space.Compact>
      );
      default: return <Input {...commonProps} value={value as string} onChange={(e) => setValue(e.target.value)} onBlur={() => triggerSave(value)} />;
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 13 }}>{item.label}</Text>
        <div style={{ fontSize: 12 }}>
          {loading && <Text type="secondary"><LoadingOutlined /> 同步中...</Text>}
          {success && <Text type="success"><CheckCircleOutlined /> 已保存</Text>}
        </div>
      </div>
      {renderControl()}
      {item.tooltip && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{item.tooltip}</div>}
    </div>
  );
};

export default function AdminSettingsPage() {
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const { mobile } = useResponsive();
  const router = useRouter();
  const isFetched = useRef(false);

  const fetchValues = useCallback(async () => {
    const auth = getAuth();
    if (!auth || auth.user.role !== 'ADMIN') { router.push('/'); return; }
    
    // 防止重复拉取
    if (isFetched.current) return;
    
    setLoading(true);
    try {
      const configRes = await fetch('/api/proxy/config/all', { headers: getAuthHeader() });
      const configData = (await configRes.json()) as { success: boolean; data: Record<string, unknown> };
      if (configData.success) {
        setConfigValues(configData.data);
        isFetched.current = true;
      }
    } catch { 
      message.error('获取配置数值失败'); 
    } finally { 
      setLoading(false); 
    }
  }, [router]);

  useEffect(() => { 
    fetchValues(); 
  }, [fetchValues]);

  const testSmtp = async () => {
    setTesting(true);
    try {
      // 📝 关键：确保发送的是当前页面上最新的 state
      const res = await fetch('/api/proxy/config/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(configValues)
      });
      const data = (await res.json()) as { success: boolean; message: string };
      if (data.success) message.success('SMTP 连接成功');
      else message.error(data.message);
    } catch { message.error('测试请求失败，请检查网络'); } finally { setTesting(false); }
  };

  if (loading && !isFetched.current) return <div style={{ padding: 100, textAlign: 'center' }}><Spin tip="拉取实时配置..." /></div>;

  const groups = Array.from(new Set(LOCAL_SYSTEM_CONFIG_SCHEMA.map(s => s.group)));
  const tabItems = groups.map(groupName => ({
    key: groupName,
    label: groupName,
    children: (
      <div style={{ padding: '16px 8px' }}>
        {LOCAL_SYSTEM_CONFIG_SCHEMA.filter(s => s.group === groupName).map(item => (
          <ConfigField key={item.key} item={item} initialValue={configValues[item.key]} />
        ))}
        {groupName === '邮件服务' && (
          <Button icon={<ThunderboltOutlined />} onClick={testSmtp} loading={testing} style={{ marginTop: 8 }}>
            测试 SMTP 连接
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
          <Title level={2} style={{ margin: 0, fontWeight: 800 }}>系统配置</Title>
        </div>
        <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <Tabs defaultActiveKey={groups[0]} items={tabItems} tabPosition={mobile ? 'top' : 'left'} style={{ minHeight: 450 }} />
        </Card>
      </Content>
    </Layout>
  );
}
