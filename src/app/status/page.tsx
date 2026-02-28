'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Typography, Card, Space, Button, Badge, Statistic, Spin, Divider, List } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, DatabaseOutlined, ClockCircleOutlined, CodeOutlined, DashboardOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useResponsive } from 'antd-style';
import type { BadgeProps } from 'antd';

const { Content, Header } = Layout;
const { Title, Text } = Typography;

interface ServerHealth {
  dbStatus: 'connected' | 'push_failed' | 'disconnected' | 'none';
  dbType: string;
  nodeVersion: string;
  uptime: number;
  memory: {
    rss: string;
    heapTotal: string;
  };
  timestamp: string;
}

export default function StatusPage() {
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const { mobile } = useResponsive();

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/config/health');
      const json = (await res.json()) as { success: boolean; data: ServerHealth };
      if (json.success) setHealth(json.data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, 30000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  const getDbStatusInfo = () => {
    switch (health?.dbStatus) {
      case 'connected': return { color: 'success' as BadgeProps['status'], text: '已连接' };
      case 'push_failed': return { color: 'warning' as BadgeProps['status'], text: '同步受限' };
      case 'none': return { color: 'default' as BadgeProps['status'], text: '本地模式' };
      default: return { color: 'error' as BadgeProps['status'], text: '未连接' };
    }
  };

  const dbInfo = getDbStatusInfo();

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <Header style={{ 
        background: '#fff', 
        borderBottom: '1px solid #f0f0f0', 
        padding: mobile ? '0 16px' : '0 40px',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between'
      }}>
        <Space>
          <Link href="/"><Button icon={<ArrowLeftOutlined />} type="text" /></Link>
          <Title level={5} style={{ margin: 0 }}>系统状态</Title>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={fetchHealth} loading={loading} type="text" />
      </Header>

      <Content style={{ padding: mobile ? '24px 16px' : '48px 40px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2} style={{ fontWeight: 800, marginBottom: 8 }}>服务器看板</Title>
          <Text type="secondary">实时监测 ToolBox 核心组件运行状况</Text>
        </div>

        {loading && !health ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin tip="正在建立连接..." /></div>
        ) : (
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              <Card variant="borderless" style={{ background: '#fcfcfc', borderRadius: 12, border: '1px solid #f0f0f0' }}>
                <Statistic 
                  title={<Space><DatabaseOutlined /> 数据库状态</Space>}
                  value={dbInfo.text}
                  prefix={<Badge status={dbInfo.color} />}
                />
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>类型: {health?.dbType?.toUpperCase() || 'UNKNOWN'}</Text>
              </Card>

              <Card variant="borderless" style={{ background: '#fcfcfc', borderRadius: 12, border: '1px solid #f0f0f0' }}>
                <Statistic 
                  title={<Space><ClockCircleOutlined /> 正常运行时间</Space>}
                  value={formatUptime(health?.uptime || 0)}
                />
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>自上次启动以来</Text>
              </Card>
            </div>

            <Card title={<Space><DashboardOutlined /> 环境详情</Space>} variant="borderless" style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}>
              <List size="small">
                <List.Item extra={<Text strong>{health?.nodeVersion}</Text>}>
                  <Space><CodeOutlined /> 运行时版本</Space>
                </List.Item>
                <List.Item extra={<Text strong>{health?.memory.rss}</Text>}>
                  内存占用 (RSS)
                </List.Item>
                <List.Item extra={<Text strong>{health?.memory.heapTotal}</Text>}>
                  内存占用 (Heap)
                </List.Item>
                <List.Item extra={<Text type="secondary" style={{ fontSize: 12 }}>{new Date(health?.timestamp || '').toLocaleString()}</Text>}>
                  最后更新
                </List.Item>
              </List>
            </Card>

            <div style={{ padding: '16px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 12, display: 'flex', gap: 12 }}>
              <Badge status="processing" />
              <div>
                <div style={{ fontWeight: 600 }}>服务可靠性说明</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                  本页面数据由 API 节点实时反馈。如果数据库显示断开，登录功能将被自动熔断，但文档处理等无状态工具仍可尝试使用。
                </div>
              </div>
            </div>
          </Space>
        )}
      </Content>
    </Layout>
  );
}
