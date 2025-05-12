/**
 * 服务器单元测试
 */
const request = require('supertest');
const app = require('../server');
const path = require('path');
const fs = require('fs');

// 健康检查测试
describe('健康检查API', () => {
  test('GET /health 应返回200状态码和正确的健康状态', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('version');
  });
});

// 404处理测试
describe('404处理', () => {
  test('访问不存在的路由应返回404状态码和错误信息', async () => {
    const response = await request(app).get('/non-existent-route');
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code', 'RESOURCE_NOT_FOUND');
  });
});

// 文件API测试
describe('文件API', () => {
  // 测试获取文件列表
  test('GET /api/v1/files 应返回文件列表', async () => {
    const response = await request(app).get('/api/v1/files');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });
  
  // 测试文件上传 - 需要模拟文件上传
  test('POST /api/v1/files 应成功上传音频文件', async () => {
    // 使用测试音频文件
    const testFilePath = path.join(__dirname, '../../test_audio.mp3');
    
    // 检查测试文件是否存在
    if (!fs.existsSync(testFilePath)) {
      console.warn('测试音频文件不存在，跳过文件上传测试');
      return;
    }
    
    const response = await request(app)
      .post('/api/v1/files')
      .attach('audioFile', testFilePath);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('fileId');
    expect(response.body.data).toHaveProperty('originalName');
    expect(response.body.data).toHaveProperty('status', 'pending');
    
    // 保存fileId用于后续测试
    if (response.body.data && response.body.data.fileId) {
      global.testFileId = response.body.data.fileId;
    }
  });
});

// 转录API测试
describe('转录API', () => {
  // 测试转录请求 - 依赖于上传文件测试
  test('POST /api/v1/transcribe/:fileId 应成功提交转录请求', async () => {
    // 如果没有测试文件ID，跳过测试
    if (!global.testFileId) {
      console.warn('没有可用的测试文件ID，跳过转录请求测试');
      return;
    }
    
    const response = await request(app)
      .post(`/api/v1/transcribe/${global.testFileId}`)
      .send({
        language: 'zh'
      });
    
    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('status', 'processing');
  });
  
  // 测试获取转录状态
  test('GET /api/v1/transcribe/:fileId/status 应返回转录状态', async () => {
    // 如果没有测试文件ID，跳过测试
    if (!global.testFileId) {
      console.warn('没有可用的测试文件ID，跳过转录状态测试');
      return;
    }
    
    const response = await request(app)
      .get(`/api/v1/transcribe/${global.testFileId}/status`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('fileId', global.testFileId);
    expect(response.body.data).toHaveProperty('status');
  });
}); 