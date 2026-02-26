'use client';

import React, { useState } from 'react';
import { Layout, Typography, Button, Input, Card, message, Breadcrumb, notification, Segmented, Space } from 'antd';
import { ArrowLeft, FileDown, Loader2, FileText, Image as ImageIcon, FileType } from 'lucide-react';
import Link from 'next/link';
import { useResponsive } from 'antd-style';
import { getAuthHeader } from '@/lib/auth';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const PROXY_PATH = '/api/proxy';
const DIRECT_API_URL = process.env.NEXT_PUBLIC_DIRECT_API_URL || PROXY_PATH;

type ExportFormat = 'pdf' | 'docx' | 'png';

export default function MarkdownPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const { mobile } = useResponsive();

  const formatOptions = [
    { label: <Space><FileType size={14}/>PDF</Space>, value: 'pdf' },
    { label: <Space><FileText size={14}/>DOCX</Space>, value: 'docx' },
    { label: <Space><ImageIcon size={14}/>PNG</Space>, value: 'png' },
  ];

  const showErrorLog = (msg: string, error: unknown) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    notification.error({
      message: msg,
      title: msg,
      description: errorMsg,
      duration: 5,
      placement: 'topRight',
    });
  };

  const handleConvert = async () => {
    if (!content.trim()) {
      message.warning('请输入 Markdown 内容');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${PROXY_PATH}/convert/md-to-pdf`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ 
          content, 
          title: 'markdown_export',
          format 
        })
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text || '提交失败'}`);
      }
      
      const responseData = (await res.json()) as { jobId: string };
      const jobId = responseData.jobId;

      const poll = async () => {
        try {
          const statusRes = await fetch(`${PROXY_PATH}/convert/md/status/${jobId}`, {
            headers: getAuthHeader()
          });
          const data = (await statusRes.json()) as { status: string; token: string; error?: string; outputSize?: number };

          if (data.status === 'completed') {
            window.open(`${DIRECT_API_URL}/convert/md/download/${jobId}?token=${data.token}`, '_blank');
            setLoading(false);
            message.success('转换成功！');
          } else if (data.status === 'failed') {
            showErrorLog('转换任务失败', data.error);
            setLoading(false);
          } else {
            setTimeout(poll, 2000);
          }
        } catch (pollErr: unknown) {
          showErrorLog('状态查询异常', pollErr);
          setLoading(false);
        }
      };
      poll();
    } catch (err: unknown) {
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
            { title: 'Markdown 转换' }
          ]} />
        </div>

        <div style={{ marginBottom: 32, display: 'flex', flexDirection: mobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: mobile ? 'flex-start' : 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/"><Button icon={<ArrowLeft size={16} />} type="text" /></Link>
            <div>
              <Title level={2} style={{ margin: 0 }}>Markdown 转换</Title>
              <Text type="secondary">导出为高质量 PDF、DOCX 或 PNG 图片</Text>
            </div>
          </div>
          
          <Space direction={mobile ? 'vertical' : 'horizontal'} style={{ width: mobile ? '100%' : 'auto' }}>
            <Segmented
              options={formatOptions}
              value={format}
              onChange={(value) => setFormat(value as ExportFormat)}
              disabled={loading}
            />
            <Button 
              type="primary" 
              icon={loading ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />} 
              disabled={loading}
              onClick={handleConvert}
              size="large"
              block={mobile}
              style={{ background: '#000', borderColor: '#000' }}
            >
              {loading ? `正在生成 ${format.toUpperCase()}...` : `导出 ${format.toUpperCase()}`}
            </Button>
          </Space>
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
