/**
 * 集成测试 - 测试完整的文件上传和转录流程
 */
const request = require('supertest');
const app = require('../server');
const path = require('path');
const fs = require('fs');

// 测试配置
jest.setTimeout(30000); // 增加超时时间，因为转录可能需要较长时间

// 全局变量，用于存储测试过程中的数据
let testFileId;

// 集成测试 - 完整流程
describe('文件上传和转录流程', () => {
  // 步骤1: 上传文件
  test('步骤1: 上传音频文件', async () => {
    // 使用测试音频文件
    const testFilePath = path.join(__dirname, '../../test_audio.mp3');
    
    // 检查测试文件是否存在
    if (!fs.existsSync(testFilePath)) {
      console.warn('测试音频文件不存在，跳过集成测试');
      return;
    }
    
    const response = await request(app)
      .post('/api/v1/files')
      .attach('audioFile', testFilePath);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('fileId');
    
    // 保存fileId用于后续测试
    testFileId = response.body.data.fileId;
    console.log(`已上传文件，ID: ${testFileId}`);
  });
  
  // 步骤2: 提交转录请求
  test('步骤2: 提交转录请求', async () => {
    // 如果没有测试文件ID，跳过测试
    if (!testFileId) {
      console.warn('没有可用的测试文件ID，跳过转录请求测试');
      return;
    }
    
    const response = await request(app)
      .post(`/api/v1/transcribe/${testFileId}`)
      .send({
        language: 'zh'
      });
    
    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('status', 'processing');
    
    console.log('已提交转录请求，状态: processing');
  });
  
  // 步骤3: 检查转录状态
  test('步骤3: 检查转录状态', async () => {
    // 如果没有测试文件ID，跳过测试
    if (!testFileId) {
      console.warn('没有可用的测试文件ID，跳过转录状态测试');
      return;
    }
    
    const response = await request(app)
      .get(`/api/v1/transcribe/${testFileId}/status`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('fileId', testFileId);
    
    // 状态可能是 pending, processing, completed, error
    const status = response.body.data.status;
    console.log(`转录状态: ${status}`);
    
    // 我们不检查具体状态，因为它可能取决于API密钥是否配置等外部因素
  });
  
  // 步骤4: 获取转录结果（可能还未完成）
  test('步骤4: 获取转录结果', async () => {
    // 如果没有测试文件ID，跳过测试
    if (!testFileId) {
      console.warn('没有可用的测试文件ID，跳过获取转录结果测试');
      return;
    }
    
    const response = await request(app)
      .get(`/api/v1/transcribe/${testFileId}/result`);
    
    // 状态码可能是200（成功）或202（处理中）
    expect([200, 202].includes(response.status)).toBe(true);
    expect(response.body).toHaveProperty('success', true);
    
    if (response.status === 200) {
      console.log('转录已完成，结果可用');
      expect(response.body.data).toHaveProperty('transcription');
    } else {
      console.log('转录尚未完成');
    }
  });
  
  // 步骤5: 清理 - 删除测试文件
  test('步骤5: 清理 - 删除测试文件', async () => {
    // 如果没有测试文件ID，跳过测试
    if (!testFileId) {
      console.warn('没有可用的测试文件ID，跳过文件删除测试');
      return;
    }
    
    const response = await request(app)
      .delete(`/api/v1/files/${testFileId}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('message', '文件已成功删除');
    
    console.log('已删除测试文件');
  });
}); 