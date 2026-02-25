/**
 * 前端 API 请求客户端
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7860/api';

export const fetchUsers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`);
    if (!response.ok) throw new Error('网络请求失败');
    return await response.json();
  } catch (error) {
    console.error('获取用户数据失败:', error);
    return { success: false, data: [] };
  }
};
