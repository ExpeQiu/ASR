// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"index.js":[function(require,module,exports) {
/**
 * 语音转文字工具前端主文件
 * 实现文件上传、拖放、发送请求和展示结果功能
 */

// 获取DOM元素
var dropArea = document.getElementById('dropArea');
var audioFilesInput = document.getElementById('audioFilesInput');
var fileList = document.getElementById('fileList');
var startAllButton = document.getElementById('startAllButton');
var globalStatusMessage = document.getElementById('globalStatusMessage');
var transcriptionFileName = document.getElementById('transcriptionFileName');
var transcriptionOutput = document.getElementById('transcriptionOutput');
var templateSelect = document.getElementById('templateSelect');
var copyButton = document.getElementById('copyButton');
var downloadButton = document.getElementById('downloadButton');

// 全局变量
var API_BASE_URL = 'http://localhost:8000/api/v1'; // 后端API基础URL
var uploadedFiles = []; // 存储上传的文件信息
var activeFileId = null; // 当前选中的文件ID

/**
 * 初始化事件监听器
 */
function initEventListeners() {
  // 文件选择器变更事件
  audioFilesInput.addEventListener('change', handleFilesSelected);

  // 文件拖放区域事件
  dropArea.addEventListener('click', function () {
    return audioFilesInput.click();
  });
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
  var files = event.target.files;
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
  var files = event.dataTransfer.files;
  if (files && files.length > 0) {
    processFiles(files);
  }
}

/**
 * 处理文件上传
 * @param {FileList} files - 文件列表
 */
function processFiles(files) {
  var validFiles = 0;
  var allowedFormats = ['.mp3', '.wav', '.m4a', '.flac'];
  var maxSize = 52428800; // 50MB

  Array.from(files).forEach(function (file) {
    // 检查文件格式
    var fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedFormats.includes(fileExt)) {
      showGlobalMessage("\u4E0D\u652F\u6301\u7684\u6587\u4EF6\u683C\u5F0F: ".concat(file.name), 'error');
      return;
    }

    // 检查文件大小
    if (file.size > maxSize) {
      showGlobalMessage("\u6587\u4EF6\u5927\u5C0F\u8D85\u8FC7\u9650\u5236 (50MB): ".concat(file.name), 'error');
      return;
    }

    // 生成唯一文件ID
    var fileId = generateUniqueId();

    // 添加到文件列表
    uploadedFiles.push({
      id: fileId,
      file: file,
      originalName: file.name,
      size: file.size,
      status: 'pending',
      // 状态: pending, uploading, processing, completed, error
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
  uploadedFiles.forEach(function (fileInfo) {
    var listItem = document.createElement('li');
    listItem.className = "file-item ".concat(fileInfo.status, " ").concat(activeFileId === fileInfo.id ? 'active' : '');
    listItem.dataset.fileId = fileInfo.id;

    // 根据文件状态显示不同内容
    var statusText = getStatusText(fileInfo.status);
    var formattedSize = formatFileSize(fileInfo.size);
    listItem.innerHTML = "\n            <div class=\"file-item-header\">\n                <div class=\"file-name\">".concat(fileInfo.originalName, "</div>\n                <div class=\"file-size\">").concat(formattedSize, "</div>\n            </div>\n            <div class=\"file-status ").concat(fileInfo.status, "\">").concat(statusText, "</div>\n            <div class=\"progress-bar-container\">\n                <div class=\"progress-bar progress-").concat(fileInfo.progress, "\"></div>\n            </div>\n        ");

    // 通过JS设置宽度而不是内联样式
    var progressBar = listItem.querySelector('.progress-bar');
    progressBar.style.width = "".concat(fileInfo.progress, "%");

    // 点击文件项显示转录结果
    listItem.addEventListener('click', function () {
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
  switch (status) {
    case 'pending':
      return '等待上传';
    case 'uploading':
      return '上传中...';
    case 'processing':
      return '转录处理中...';
    case 'completed':
      return '转录完成';
    case 'error':
      return '处理失败';
    default:
      return '未知状态';
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
  var pendingFiles = uploadedFiles.filter(function (fileInfo) {
    return fileInfo.status === 'pending';
  });
  if (pendingFiles.length === 0) {
    showGlobalMessage('没有待处理的文件', 'error');
    return;
  }
  pendingFiles.forEach(function (fileInfo) {
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
  var formData = new FormData();
  formData.append('audioFile', fileInfo.file);

  // 创建XHR请求
  var xhr = new XMLHttpRequest();

  // 进度事件
  xhr.upload.addEventListener('progress', function (event) {
    if (event.lengthComputable) {
      var percentComplete = Math.round(event.loaded / event.total * 100);
      fileInfo.progress = percentComplete;
      renderFileList();
    }
  });

  // 请求完成
  xhr.addEventListener('load', function () {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        var response = JSON.parse(xhr.responseText);
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
          showGlobalMessage("\u4E0A\u4F20\u5931\u8D25: ".concat(response.error.message), 'error');
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
      fileInfo.error = "HTTP\u9519\u8BEF: ".concat(xhr.status);
      showGlobalMessage("\u4E0A\u4F20\u5931\u8D25: HTTP\u9519\u8BEF ".concat(xhr.status), 'error');
      renderFileList();
    }
  });

  // 请求错误
  xhr.addEventListener('error', function () {
    fileInfo.status = 'error';
    fileInfo.error = '网络错误';
    showGlobalMessage('上传失败: 网络错误', 'error');
    renderFileList();
  });

  // 请求超时
  xhr.addEventListener('timeout', function () {
    fileInfo.status = 'error';
    fileInfo.error = '请求超时';
    showGlobalMessage('上传失败: 请求超时', 'error');
    renderFileList();
  });

  // 发送请求
  xhr.open('POST', "".concat(API_BASE_URL, "/files"), true);
  xhr.send(formData);
}

/**
 * 触发文件转录处理
 * @param {Object} fileInfo - 文件信息对象
 */
function transcribeFile(fileInfo) {
  // 创建转录请求
  fetch("".concat(API_BASE_URL, "/transcriptions/").concat(fileInfo.serverId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  }).then(function (response) {
    if (!response.ok) {
      throw new Error("HTTP error ".concat(response.status));
    }
    return response.json();
  }).then(function (data) {
    if (data.success) {
      // 开始轮询转录状态
      pollTranscriptionStatus(fileInfo);
    } else {
      throw new Error(data.error.message || '转录请求失败');
    }
  }).catch(function (error) {
    fileInfo.status = 'error';
    fileInfo.error = error.message;
    showGlobalMessage("\u8F6C\u5F55\u5904\u7406\u5931\u8D25: ".concat(error.message), 'error');
    renderFileList();
  });
}

/**
 * 轮询转录状态
 * @param {Object} fileInfo - 文件信息对象
 */
function pollTranscriptionStatus(fileInfo) {
  var _checkStatus = function checkStatus() {
    fetch("".concat(API_BASE_URL, "/transcriptions/").concat(fileInfo.serverId, "/status")).then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP error ".concat(response.status));
      }
      return response.json();
    }).then(function (data) {
      if (data.success) {
        var status = data.data.status;
        if (status === 'completed') {
          // 转录完成，获取结果
          getTranscriptionResult(fileInfo);
        } else if (status === 'error') {
          // 转录错误
          throw new Error(data.data.error || '转录处理失败');
        } else {
          // 继续轮询
          setTimeout(_checkStatus, 2000);
        }
      } else {
        throw new Error(data.error.message || '获取状态失败');
      }
    }).catch(function (error) {
      fileInfo.status = 'error';
      fileInfo.error = error.message;
      showGlobalMessage("\u83B7\u53D6\u8F6C\u5F55\u72B6\u6001\u5931\u8D25: ".concat(error.message), 'error');
      renderFileList();
    });
  };

  // 开始轮询
  _checkStatus();
}

/**
 * 获取转录结果
 * @param {Object} fileInfo - 文件信息对象
 */
function getTranscriptionResult(fileInfo) {
  fetch("".concat(API_BASE_URL, "/transcriptions/").concat(fileInfo.serverId, "/result")).then(function (response) {
    if (!response.ok) {
      throw new Error("HTTP error ".concat(response.status));
    }
    return response.json();
  }).then(function (data) {
    if (data.success) {
      // 更新状态和结果
      fileInfo.status = 'completed';
      fileInfo.result = data.data.transcription;
      renderFileList();

      // 如果这是当前活跃的文件，显示结果
      if (activeFileId === fileInfo.id) {
        displayTranscriptionResult(fileInfo);
      }
      showGlobalMessage("".concat(fileInfo.originalName, " \u8F6C\u5F55\u5B8C\u6210\uFF01"), 'success');
    } else {
      throw new Error(data.error.message || '获取结果失败');
    }
  }).catch(function (error) {
    fileInfo.status = 'error';
    fileInfo.error = error.message;
    showGlobalMessage("\u83B7\u53D6\u8F6C\u5F55\u7ED3\u679C\u5931\u8D25: ".concat(error.message), 'error');
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
    transcriptionOutput.value = "\u6587\u4EF6\u72B6\u6001: ".concat(getStatusText(fileInfo.status));
    if (fileInfo.error) {
      transcriptionOutput.value += "\n\u9519\u8BEF\u4FE1\u606F: ".concat(fileInfo.error);
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
  var fileInfo = uploadedFiles.find(function (info) {
    return info.id === activeFileId;
  });
  if (!fileInfo || fileInfo.status !== 'completed' || !fileInfo.result) return;
  var templateName = templateSelect.value;
  var formattedText = fileInfo.result;

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
  var sentences = text.split(/[.!?。！？]/g).filter(function (s) {
    return s.trim().length > 0;
  });
  var result = '';
  var currentTime = 0;
  sentences.forEach(function (sentence) {
    var minutes = Math.floor(currentTime / 60);
    var seconds = Math.floor(currentTime % 60);
    var timeStr = "[".concat(minutes.toString().padStart(2, '0'), ":").concat(seconds.toString().padStart(2, '0'), "]");
    result += "".concat(timeStr, " ").concat(sentence.trim(), "\u3002\n\n");
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
  var sentences = text.split(/[.!?。！？]/g).filter(function (s) {
    return s.trim().length > 0;
  });
  var result = '';
  var speakers = ['说话人A', '说话人B'];
  sentences.forEach(function (sentence, index) {
    var speaker = speakers[index % speakers.length];
    result += "".concat(speaker, ": ").concat(sentence.trim(), "\u3002\n\n");
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
  var fileInfo = uploadedFiles.find(function (info) {
    return info.id === activeFileId;
  });
  if (!fileInfo) return;
  var text = transcriptionOutput.value;
  var filename = fileInfo.originalName.split('.')[0] + '_转录.txt';
  var blob = new Blob([text], {
    type: 'text/plain;charset=utf-8'
  });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
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
  globalStatusMessage.className = "status-global ".concat(type);
  globalStatusMessage.classList.remove('hidden');

  // 5秒后自动隐藏
  setTimeout(function () {
    globalStatusMessage.classList.add('hidden');
  }, 5000);
}

// 页面加载完成时初始化
document.addEventListener('DOMContentLoaded', function () {
  initEventListeners();
});
},{}],"../node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;
function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}
module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;
if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "53853" + '/');
  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);
    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);
          if (didAccept) {
            handled = true;
          }
        }
      });

      // Enable HMR for CSS by default.
      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });
      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }
    if (data.type === 'reload') {
      ws.close();
      ws.onclose = function () {
        location.reload();
      };
    }
    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }
    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}
function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
}
function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  // html encode message and stack trace
  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}
function getParents(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return [];
  }
  var parents = [];
  var k, d, dep;
  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];
      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }
  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }
  return parents;
}
function hmrApply(bundle, asset) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }
  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}
function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }
  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }
  if (checkedAssets[id]) {
    return;
  }
  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }
  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}
function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};
  if (cached) {
    cached.hot.data = bundle.hotData;
  }
  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }
  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });
    return true;
  }
}
},{}]},{},["../node_modules/parcel-bundler/src/builtins/hmr-runtime.js","index.js"], null)
//# sourceMappingURL=/src.e31bb0bc.js.map