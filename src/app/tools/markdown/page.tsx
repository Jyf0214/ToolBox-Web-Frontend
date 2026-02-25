'use client';

import React, { useState } from 'react';
import { Layout, Typography, Button, Input, Card, message, Space, Breadcrumb, theme, notification } from 'antd';
import { ArrowLeft, FileDown, Loader2 } from 'lucide-react';
import Link from 'next/link';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function MarkdownPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = theme.useToken();

  const showErrorLog = (msg: string, error: any, details?: string) => {
    notification.error({
      message: msg,
      description: (
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>错误原因:</Text> {error?.message || String(error) || '未知异常'}
          </div>
          {details && (
            <div>
              <Text strong>服务器原始反馈:</Text>
              <pre style={{ fontSize: 11, background: '#f5f5f5', padding: 8, marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', borderRadius: 4 }}>
                {details}
              </pre>
            </div>
          )}
        </div>
      ),
      duration: 10,
    } as any);
  };

  const handleConvert = async () => {
    if (!content.trim()) {
      message.warning('请输入 Markdown 内容');
      return;
    }

    setLoading(true);
    try {
      // 1. 提交转换任务
      const res = await fetch('/api/proxy/convert/md-to-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title: 'markdown_export' })
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text || '提交失败'}`);
      }
      
      const { jobId } = await res.json();

      // 2. 轮询状态
      const poll = async () => {
        try {
          const statusRes = await fetch(`/api/proxy/convert/md/status/${jobId}`);
          const data = await statusRes.json();

          if (data.status === 'completed') {
            window.open(`/api/proxy/convert/md/download/${jobId}?token=${data.token}`, '_blank');
            setLoading(false);
            message.success('转换成功！');
          } else if (data.status === 'failed') {
            showErrorLog('转换任务失败', data.error);
            setLoading(false);
          } else {
            setTimeout(poll, 2000);
          }
        } catch (pollErr: any) {
          showErrorLog('状态查询异常', pollErr);
          setLoading(false);
        }
      };
      poll();
    } catch (err: any) {
      showErrorLog('请求提交失败', err);
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: '24px 16px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 24 }}>
          <Breadcrumb items={[
            { title: <Link href="/">首页</Link> },
            { title: 'Markdown 转 PDF' }
          ]} />
        </div>

        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/"><Button icon={<ArrowLeft size={16} />} type="text" /></Link>
            <div>
              <Title level={2} style={{ margin: 0 }}>Markdown 转 PDF</Title>
              <Text type="secondary">标准的 A4 纸张排版，支持 HTML 标签</Text>
            </div>
          </div>
          <Button 
            type="primary" 
            icon={loading ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />} 
            disabled={loading}
            onClick={handleConvert}
            size="large"
            style={{ background: '#000', borderColor: '#000' }}
          >
            {loading ? '正在生成 A4 PDF...' : '导出 A4 PDF'}
          </Button>
        </div>

        <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <TextArea
            placeholder="# 在这里输入你的 Markdown 内容..."
            autoSize={{ minRows: 20, maxRows: 30 }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ 
              fontFamily: 'monospace', 
              fontSize: 16, 
              border: 'none', 
              resize: 'none',
              padding: 0
            }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
