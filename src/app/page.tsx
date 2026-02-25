'use client';

import React from 'react';
import { ConfigProvider, App, Button } from 'antd';
import { FileConverter } from './components/FileConverter';
import { Header, Footer, Hero, Features, Logo } from '@lobehub/ui';
import { LucideZap, LucideShieldCheck, LucideLayoutDashboard, LucideGithub } from 'lucide-react';
import { useResponsive } from 'antd-style';

/**
 * ToolBox-Web 极简组件化主页
 * 完全基于 LobeUI 和 Ant Design 高级组件
 */
export default function Home() {
  const { mobile } = useResponsive();

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 12,
        },
      }}
    >
      <div style={{ backgroundColor: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header 
          logo={<Logo extra="ToolBox" size={32} />}
          nav={[
            <Button key="docs" type="text" style={{ fontWeight: 600 }}>文档工具</Button>,
            <Button key="about" type="text" style={{ fontWeight: 600 }}>关于项目</Button>
          ]}
          actions={[
            <Button 
              key="github" 
              type="text" 
              icon={<LucideGithub size={20} />} 
              href="https://github.com/Jyf0214/ToolBox-Web"
              target="_blank"
            />
          ]}
        />
        
        <main style={{ paddingBottom: 80 }}>
          <Hero
            actions={[
              {
                link: '#',
                text: '了解更多',
                type: 'primary',
              }
            ]}
            description="简单、极速、私有化的模块化文档工具箱。基于 LibreOffice 高性能内核，保护您的数据隐私。"
            title="一站式文档<br/>格式转换工具"
          />

          <div style={{ maxWidth: 600, margin: '-60px auto 60px', width: '100%', padding: '0 16px', position: 'relative', zIndex: 10 }}>
            <FileConverter />
          </div>

          <Features
            items={[
              {
                description: '秒级响应的文档转换体验，无需等待。基于异步任务队列设计，确保任务处理高效可靠。',
                icon: LucideZap,
                title: '极速转换',
              },
              {
                description: '不保留任何用户原始文件。转换完成立即自动清理，支持私有化部署，数据主权完全掌握在您手中。',
                icon: LucideShieldCheck,
                title: '隐私至上',
              },
              {
                description: '适配所有终端。无论是手机还是桌面端，都能获得一致且极致的流畅交互体验。',
                icon: LucideLayoutDashboard,
                title: '响应式设计',
              },
            ]}
          />
        </main>

        <Footer 
          bottom={`ToolBox-Web © 2026 Crafted by Jyf0214`}
          columns={[
            {
              title: '开源',
              items: [
                { title: 'GitHub', url: 'https://github.com/Jyf0214/ToolBox-Web', openExternal: true },
                { title: '提交反馈', url: 'https://github.com/Jyf0214/ToolBox-Web/issues', openExternal: true },
              ]
            },
            {
              title: '技术栈',
              items: [
                { title: 'Next.js 16', url: 'https://nextjs.org', openExternal: true },
                { title: 'Lobe UI', url: 'https://ui.lobehub.com', openExternal: true },
                { title: 'Ant Design', url: 'https://ant.design', openExternal: true },
              ]
            }
          ]}
        />
      </div>
    </ConfigProvider>
  );
}
