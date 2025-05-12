/**
 * 语音转文字工具前端主文件
 * 实现文件上传、拖放、发送请求和展示结果功能
 */

// 获取DOM元素
const dropArea = document.getElementById('dropArea');
const audioFilesInput = document.getElementById('audioFilesInput');
const fileList = document.getElementById('fileList');
const startAllButton = document.getElementById('startAllButton');
const globalStatusMessage = document.getElementById('globalStatusMessage');
const transcriptionFileName = document.getElementById('transcriptionFileName');
const transcriptionOutput = document.getElementById('transcriptionOutput');
const templateSelect = document.getElementById('templateSelect');
const copyButton = document.getElementById('copyButton');
const downloadButton = document.getElementById('downloadButton');

// 全局变量
const API_BASE_URL = 'http://localhost:8000/api/v1'; // 后端API基础URL
const uploadedFiles = []; // 存储上传的文件信息
let activeFileId = null; // 当前选中的文件ID

/**
 * 初始化事件监听器
 */
function initEventListeners() {
    // 文件选择器变更事件
    audioFilesInput.addEventListener('change', handleFilesSelected);

    // 文件拖放区域事件
    dropArea.addEventListener('click', () => audioFilesInput.click());
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('drop', handleDrop);
    
    // 开始转录按钮事件
    startAllButton.addEventListener('click', startAllTranscriptions);
    
    // 输出操作按钮事件
    copyButton.addEventListener('click', copyTranscriptionText);
    downloadButton.addEventListener('click', downloadTranscriptionText);
    
    // 模板选择变更事件
    templateSelect.addEventListener('change', applyTemplate);
}

/**
 * 文件选择处理函数
 * @param {Event} event - 文件选择事件
 */
function handleFilesSelected(event) {
    const files = event.target.files;
    if (files && files.length > 0) {
        processFiles(files);
    }
}

/**
 * 拖拽悬停处理函数
 * @param {Event} event - 拖拽事件
 */
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    dropArea.classList.add('dragover');
}

/**
 * 文件拖放处理函数
 * @param {Event} event - 拖放事件
 */
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    dropArea.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
        processFiles(files);
    }
}

/**
 * 处理文件上传
 * @param {FileList} files - 文件列表
 */
function processFiles(files) {
    let validFiles = 0;
    const allowedFormats = ['.mp3', '.wav', '.m4a', '.flac'];
    const maxSize = 52428800; // 50MB
    
    Array.from(files).forEach(file => {
        // 检查文件格式
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedFormats.includes(fileExt)) {
            showGlobalMessage(`不支持的文件格式: ${file.name}`, 'error');
            return;
        }
        
        // 检查文件大小
        if (file.size > maxSize) {
            showGlobalMessage(`文件大小超过限制 (50MB): ${file.name}`, 'error');
            return;
        }
        
        // 生成唯一文件ID
        const fileId = generateUniqueId();
        
        // 添加到文件列表
        uploadedFiles.push({
            id: fileId,
            file: file,
            originalName: file.name,
            size: file.size,
            status: 'pending', // 状态: pending, uploading, processing, completed, error
            progress: 0,
            result: null
        });
        
        // 更新UI
        renderFileList();
        validFiles++;
    });
    
    // 如果有有效文件，启用开始按钮
    if (validFiles > 0) {
        startAllButton.disabled = false;
    }
}

/**
 * 渲染文件列表
 */
function renderFileList() {
    fileList.innerHTML = '';
    
    uploadedFiles.forEach(fileInfo => {
        const listItem = document.createElement('li');
        listItem.className = `file-item ${fileInfo.status} ${activeFileId === fileInfo.id ? 'active' : ''}`;
        listItem.dataset.fileId = fileInfo.id;
        
        // 根据文件状态显示不同内容
        const statusText = getStatusText(fileInfo.status);
        const formattedSize = formatFileSize(fileInfo.size);
        
        listItem.innerHTML = `
            <div class="file-item-header">
                <div class="file-name">${fileInfo.originalName}</div>
                <div class="file-size">${formattedSize}</div>
            </div>
            <div class="file-status ${fileInfo.status}">${statusText}</div>
            <div class="progress-bar-container">
                <div class="progress-bar progress-${fileInfo.progress}"></div>
            </div>
        `;
        
        // 通过JS设置宽度而不是内联样式
        const progressBar = listItem.querySelector('.progress-bar');
        progressBar.style.width = `${fileInfo.progress}%`;
        
        // 点击文件项显示转录结果
        listItem.addEventListener('click', () => {
            activeFileId = fileInfo.id;
            renderFileList(); // 更新活跃状态
            displayTranscriptionResult(fileInfo);
        });
        
        fileList.appendChild(listItem);
    });
}

/**
 * 根据文件状态获取状态文本
 * @param {string} status - 文件状态
 * @returns {string} 状态描述文本
 */
function getStatusText(status) {
    switch(status) {
        case 'pending': return '等待上传';
        case 'uploading': return '上传中...';
        case 'processing': return '转录处理中...';
        case 'completed': return '转录完成';
        case 'error': return '处理失败';
        default: return '未知状态';
    }
}

/**
 * 格式化文件大小
 * @param {number} bytes - 文件字节大小
 * @returns {string} 格式化后的大小字符串
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * 开始所有文件的转录处理
 */
function startAllTranscriptions() {
    const pendingFiles = uploadedFiles.filter(fileInfo => fileInfo.status === 'pending');
    
    if (pendingFiles.length === 0) {
        showGlobalMessage('没有待处理的文件', 'error');
        return;
    }
    
    pendingFiles.forEach(fileInfo => {
        uploadFile(fileInfo);
    });
}

/**
 * 上传单个文件
 * @param {Object} fileInfo - 文件信息对象
 */
function uploadFile(fileInfo) {
    // 更新状态
    fileInfo.status = 'uploading';
    fileInfo.progress = 0;
    renderFileList();
    
    // 创建FormData对象
    const formData = new FormData();
    formData.append('audioFile', fileInfo.file);
    
    // 创建XHR请求
    const xhr = new XMLHttpRequest();
    
    // 进度事件
    xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            fileInfo.progress = percentComplete;
            renderFileList();
        }
    });
    
    // 请求完成
    xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    // 上传成功，开始处理转录
                    fileInfo.serverId = response.data.fileId;
                    fileInfo.status = 'processing';
                    fileInfo.progress = 100;
                    renderFileList();
                    
                    // 触发转录处理
                    transcribeFile(fileInfo);
                } else {
                    // 处理错误
                    fileInfo.status = 'error';
                    fileInfo.error = response.error.message;
                    showGlobalMessage(`上传失败: ${response.error.message}`, 'error');
                    renderFileList();
                }
            } catch (e) {
                // JSON解析错误
                fileInfo.status = 'error';
                fileInfo.error = '服务器响应格式错误';
                showGlobalMessage('服务器响应格式错误', 'error');
                renderFileList();
            }
        } else {
            // HTTP错误
            fileInfo.status = 'error';
            fileInfo.error = `HTTP错误: ${xhr.status}`;
            showGlobalMessage(`上传失败: HTTP错误 ${xhr.status}`, 'error');
            renderFileList();
        }
    });
    
    // 请求错误
    xhr.addEventListener('error', () => {
        fileInfo.status = 'error';
        fileInfo.error = '网络错误';
        showGlobalMessage('上传失败: 网络错误', 'error');
        renderFileList();
    });
    
    // 请求超时
    xhr.addEventListener('timeout', () => {
        fileInfo.status = 'error';
        fileInfo.error = '请求超时';
        showGlobalMessage('上传失败: 请求超时', 'error');
        renderFileList();
    });
    
    // 发送请求
    xhr.open('POST', `${API_BASE_URL}/files`, true);
    xhr.send(formData);
}

/**
 * 触发文件转录处理
 * @param {Object} fileInfo - 文件信息对象
 */
function transcribeFile(fileInfo) {
    // 创建转录请求
    fetch(`${API_BASE_URL}/transcriptions/${fileInfo.serverId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // 开始轮询转录状态
            pollTranscriptionStatus(fileInfo);
        } else {
            throw new Error(data.error.message || '转录请求失败');
        }
    })
    .catch(error => {
        fileInfo.status = 'error';
        fileInfo.error = error.message;
        showGlobalMessage(`转录处理失败: ${error.message}`, 'error');
        renderFileList();
    });
}

/**
 * 轮询转录状态
 * @param {Object} fileInfo - 文件信息对象
 */
function pollTranscriptionStatus(fileInfo) {
    const checkStatus = () => {
        fetch(`${API_BASE_URL}/transcriptions/${fileInfo.serverId}/status`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const status = data.data.status;
                    
                    if (status === 'completed') {
                        // 转录完成，获取结果
                        getTranscriptionResult(fileInfo);
                    } else if (status === 'error') {
                        // 转录错误
                        throw new Error(data.data.error || '转录处理失败');
                    } else {
                        // 继续轮询
                        setTimeout(checkStatus, 2000);
                    }
                } else {
                    throw new Error(data.error.message || '获取状态失败');
                }
            })
            .catch(error => {
                fileInfo.status = 'error';
                fileInfo.error = error.message;
                showGlobalMessage(`获取转录状态失败: ${error.message}`, 'error');
                renderFileList();
            });
    };
    
    // 开始轮询
    checkStatus();
}

/**
 * 获取转录结果
 * @param {Object} fileInfo - 文件信息对象
 */
function getTranscriptionResult(fileInfo) {
    fetch(`${API_BASE_URL}/transcriptions/${fileInfo.serverId}/result`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // 更新状态和结果
                fileInfo.status = 'completed';
                fileInfo.result = data.data.transcription;
                renderFileList();
                
                // 如果这是当前活跃的文件，显示结果
                if (activeFileId === fileInfo.id) {
                    displayTranscriptionResult(fileInfo);
                }
                
                showGlobalMessage(`${fileInfo.originalName} 转录完成！`, 'success');
            } else {
                throw new Error(data.error.message || '获取结果失败');
            }
        })
        .catch(error => {
            fileInfo.status = 'error';
            fileInfo.error = error.message;
            showGlobalMessage(`获取转录结果失败: ${error.message}`, 'error');
            renderFileList();
        });
}

/**
 * 显示转录结果
 * @param {Object} fileInfo - 文件信息对象
 */
function displayTranscriptionResult(fileInfo) {
    transcriptionFileName.textContent = fileInfo.originalName;
    
    if (fileInfo.status === 'completed' && fileInfo.result) {
        // 应用模板格式化结果
        applyTemplate();
        
        // 启用操作按钮
        copyButton.disabled = false;
        downloadButton.disabled = false;
    } else {
        // 显示当前状态信息
        transcriptionOutput.value = `文件状态: ${getStatusText(fileInfo.status)}`;
        if (fileInfo.error) {
            transcriptionOutput.value += `\n错误信息: ${fileInfo.error}`;
        }
        
        // 禁用操作按钮
        copyButton.disabled = true;
        downloadButton.disabled = true;
    }
}

/**
 * 应用模板格式化转录结果
 */
function applyTemplate() {
    if (!activeFileId) return;
    
    const fileInfo = uploadedFiles.find(info => info.id === activeFileId);
    if (!fileInfo || fileInfo.status !== 'completed' || !fileInfo.result) return;
    
    const templateName = templateSelect.value;
    let formattedText = fileInfo.result;
    
    // 根据不同模板进行格式化（简单示例）
    switch (templateName) {
        case 'timestamp':
            // 假设原始结果中有时间戳信息，这里简单模拟
            formattedText = formatWithTimestamps(fileInfo.result);
            break;
        case 'speaker':
            // 假设原始结果中有说话人信息，这里简单模拟
            formattedText = formatWithSpeakers(fileInfo.result);
            break;
        default:
            // 默认模板，直接使用原始结果
            break;
    }
    
    transcriptionOutput.value = formattedText;
}

/**
 * 模拟添加时间戳格式
 * @param {string} text - 原始文本
 * @returns {string} 格式化后的文本
 */
function formatWithTimestamps(text) {
    // 这里仅作示例，实际应从API返回值中提取时间戳
    const sentences = text.split(/[.!?。！？]/g).filter(s => s.trim().length > 0);
    let result = '';
    let currentTime = 0;
    
    sentences.forEach(sentence => {
        const minutes = Math.floor(currentTime / 60);
        const seconds = Math.floor(currentTime % 60);
        const timeStr = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
        
        result += `${timeStr} ${sentence.trim()}。\n\n`;
        currentTime += Math.floor(sentence.length / 5) + 2; // 简单模拟时间增长
    });
    
    return result;
}

/**
 * 模拟添加说话人格式
 * @param {string} text - 原始文本
 * @returns {string} 格式化后的文本
 */
function formatWithSpeakers(text) {
    // 这里仅作示例，实际应从API返回值中提取说话人信息
    const sentences = text.split(/[.!?。！？]/g).filter(s => s.trim().length > 0);
    let result = '';
    const speakers = ['说话人A', '说话人B'];
    
    sentences.forEach((sentence, index) => {
        const speaker = speakers[index % speakers.length];
        result += `${speaker}: ${sentence.trim()}。\n\n`;
    });
    
    return result;
}

/**
 * 复制转录文本到剪贴板
 */
function copyTranscriptionText() {
    transcriptionOutput.select();
    document.execCommand('copy');
    
    showGlobalMessage('文本已复制到剪贴板！', 'success');
}

/**
 * 下载转录文本为TXT文件
 */
function downloadTranscriptionText() {
    if (!activeFileId) return;
    
    const fileInfo = uploadedFiles.find(info => info.id === activeFileId);
    if (!fileInfo) return;
    
    const text = transcriptionOutput.value;
    const filename = fileInfo.originalName.split('.')[0] + '_转录.txt';
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * 显示全局状态消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 (success/error)
 */
function showGlobalMessage(message, type) {
    globalStatusMessage.textContent = message;
    globalStatusMessage.className = `status-global ${type}`;
    globalStatusMessage.classList.remove('hidden');
    
    // 5秒后自动隐藏
    setTimeout(() => {
        globalStatusMessage.classList.add('hidden');
    }, 5000);
}

// 页面加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
}); 