/**
 * 阿里云语音识别API检查脚本
 * 用于验证API密钥是否有效
 */
const axios = require('axios');
const dotenv = require('dotenv');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 检查API密钥是否配置
const apiKey = process.env.DASHSCOPE_API_KEY;
if (!apiKey) {
  console.error(chalk.red('错误: 未配置阿里云语音识别API密钥'));
  console.log(chalk.yellow('请在环境变量或.env文件中设置DASHSCOPE_API_KEY'));
  process.exit(1);
}

// 测试API连接
async function checkApiConnection() {
  console.log(chalk.blue('正在检查阿里云语音识别API连接...'));
  
  try {
    // 发送简单请求验证API密钥
    const response = await axios.get(
      'https://dashscope.aliyuncs.com/api/v1/services/speech/models',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.status === 200) {
      console.log(chalk.green('✓ API连接成功!'));
      console.log(chalk.blue('可用的语音识别模型:'));
      
      if (response.data && response.data.models) {
        response.data.models.forEach(model => {
          console.log(chalk.cyan(`  - ${model.name}: ${model.description || '无描述'}`));
        });
      } else {
        console.log(chalk.yellow('  未返回模型信息'));
      }
      
      return true;
    } else {
      console.error(chalk.red(`✗ API返回非200状态码: ${response.status}`));
      console.error(response.data);
      return false;
    }
  } catch (error) {
    console.error(chalk.red('✗ API连接失败'));
    
    if (error.response) {
      // API返回了错误响应
      console.error(chalk.red(`状态码: ${error.response.status}`));
      console.error(chalk.red('错误详情:'), error.response.data);
    } else if (error.request) {
      // 请求发送但没有收到响应
      console.error(chalk.red('服务器无响应'));
    } else {
      // 请求设置时出错
      console.error(chalk.red('请求错误:'), error.message);
    }
    
    return false;
  }
}

// 主函数
async function main() {
  console.log(chalk.blue('===== 阿里云语音识别API检查工具 ====='));
  
  const apiConnected = await checkApiConnection();
  
  if (apiConnected) {
    console.log(chalk.green('\n✓ API密钥有效，服务可用'));
  } else {
    console.log(chalk.red('\n✗ API检查失败，请检查密钥或网络连接'));
  }
}

// 执行主函数
main().catch(err => {
  console.error(chalk.red('执行过程中发生错误:'), err);
  process.exit(1);
}); 