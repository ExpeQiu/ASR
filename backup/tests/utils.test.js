/**
 * 工具函数单元测试
 */
const path = require('path');
const fs = require('fs');
const { 
  getFileExtension,
  isAllowedFileType,
  generateSafeFilename
} = require('../utils/fileUtils');
const { 
  success, 
  error, 
  ErrorCodes 
} = require('../utils/response');

// 文件工具测试
describe('文件工具函数', () => {
  // 测试获取文件扩展名
  test('getFileExtension 应返回正确的文件扩展名', () => {
    expect(getFileExtension('test.mp3')).toBe('.mp3');
    expect(getFileExtension('test.MP3')).toBe('.mp3'); // 小写转换
    expect(getFileExtension('test.wav')).toBe('.wav');
    expect(getFileExtension('test')).toBe('');
    expect(getFileExtension('test.file.mp3')).toBe('.mp3');
  });
  
  // 测试文件类型检查
  test('isAllowedFileType 应正确验证允许的文件类型', () => {
    // 设置环境变量
    process.env.ALLOWED_FORMATS = 'mp3,wav,m4a,flac';
    
    expect(isAllowedFileType('test.mp3')).toBe(true);
    expect(isAllowedFileType('test.wav')).toBe(true);
    expect(isAllowedFileType('test.m4a')).toBe(true);
    expect(isAllowedFileType('test.flac')).toBe(true);
    expect(isAllowedFileType('test.MP3')).toBe(true); // 大写也应该允许
    expect(isAllowedFileType('test.txt')).toBe(false);
    expect(isAllowedFileType('test.jpg')).toBe(false);
  });
  
  // 测试安全文件名生成
  test('generateSafeFilename 应生成带有UUID的安全文件名', () => {
    const safeFilename = generateSafeFilename('test.mp3');
    
    // 验证生成的文件名格式
    expect(safeFilename).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp3$/);
    expect(path.extname(safeFilename)).toBe('.mp3');
  });
});

// 响应工具测试
describe('响应工具函数', () => {
  // 测试成功响应
  test('success 应返回正确格式的成功响应', () => {
    const data = { id: 1, name: 'test' };
    const meta = { total: 10 };
    
    const response = success(data, meta);
    
    expect(response).toEqual({
      success: true,
      data,
      error: null,
      meta
    });
  });
  
  // 测试错误响应
  test('error 应返回正确格式的错误响应', () => {
    const message = '测试错误';
    const code = 'TEST_ERROR';
    const details = '错误详情';
    const status = 400;
    
    const result = error(message, code, details, status);
    
    expect(result).toHaveProperty('response');
    expect(result).toHaveProperty('status', 400);
    expect(result.response).toEqual({
      success: false,
      data: null,
      error: {
        code,
        message,
        details
      },
      meta: {}
    });
  });
  
  // 测试错误代码
  test('ErrorCodes 应包含所有定义的错误代码', () => {
    expect(ErrorCodes).toHaveProperty('INVALID_REQUEST');
    expect(ErrorCodes).toHaveProperty('FILE_NOT_FOUND');
    expect(ErrorCodes).toHaveProperty('SERVER_ERROR');
    
    expect(ErrorCodes.INVALID_REQUEST).toHaveProperty('code', 'INVALID_REQUEST');
    expect(ErrorCodes.INVALID_REQUEST).toHaveProperty('status', 400);
  });
}); 