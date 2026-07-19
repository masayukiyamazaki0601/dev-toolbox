/* ===== DevToolBox - Application Logic ===== */

document.addEventListener('DOMContentLoaded', function() {
    initToolNavigation();
    updateMarkdownPreview();
    updateCounter();
});

/* ===== Tool Navigation ===== */
function initToolNavigation() {
    const navBtns = document.querySelectorAll('.tool-nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tool = this.dataset.tool;
            navBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById('panel-' + tool);
            if (panel) panel.classList.add('active');
        });
    });
}

/* ===== Utility Functions ===== */
function copyResult(elementId) {
    const el = document.getElementById(elementId);
    if (!el || (!el.value && !el.innerText)) {
        showMessage(null, 'コピーする内容がありません。', 'error');
        return;
    }
    const text = el.value || el.innerText;
    navigator.clipboard.writeText(text).then(function() {
        showMessage(null, 'クリップボードにコピーしました！', 'success');
    }).catch(function() {
        el.select();
        document.execCommand('copy');
        showMessage(null, 'クリップボードにコピーしました！', 'success');
    });
}

function clearTool() {
    var ids = Array.prototype.slice.call(arguments);
    ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'TEXTAREA') {
            el.value = '';
        } else if (el.classList.contains('diff-output')) {
            el.innerHTML = '';
        } else if (el.classList.contains('md-preview')) {
            el.innerHTML = '';
        }
    });
    if (ids.indexOf('counterInput') !== -1) {
        updateCounter();
    }
    if (ids.indexOf('mdInput') !== -1) {
        updateMarkdownPreview();
    }
}

function showMessage(elementId, message, type) {
    var msgEl;
    if (elementId) {
        msgEl = document.getElementById(elementId);
    } else {
        msgEl = document.querySelector('.tool-panel.active .tool-message');
    }
    if (!msgEl) return;
    msgEl.textContent = message;
    msgEl.className = 'tool-message ' + type;
    if (msgEl._hideTimer) clearTimeout(msgEl._hideTimer);
    msgEl._hideTimer = setTimeout(function() {
        msgEl.className = 'tool-message';
    }, 3000);
}

/* ===== 1. JSON Formatter ===== */
function formatJSON() {
    var input = document.getElementById('jsonInput').value.trim();
    if (!input) {
        showMessage('jsonMessage', 'JSONを入力してください。', 'error');
        return;
    }
    try {
        var parsed = JSON.parse(input);
        document.getElementById('jsonOutput').value = JSON.stringify(parsed, null, 2);
        showMessage('jsonMessage', '整形成功！', 'success');
    } catch (e) {
        showMessage('jsonMessage', 'JSONパースエラー: ' + e.message, 'error');
    }
}

function minifyJSON() {
    var input = document.getElementById('jsonInput').value.trim();
    if (!input) {
        showMessage('jsonMessage', 'JSONを入力してください。', 'error');
        return;
    }
    try {
        var parsed = JSON.parse(input);
        document.getElementById('jsonOutput').value = JSON.stringify(parsed);
        showMessage('jsonMessage', '圧縮成功！', 'success');
    } catch (e) {
        showMessage('jsonMessage', 'JSONパースエラー: ' + e.message, 'error');
    }
}

function validateJSON() {
    var input = document.getElementById('jsonInput').value.trim();
    if (!input) {
        showMessage('jsonMessage', 'JSONを入力してください。', 'error');
        return;
    }
    try {
        JSON.parse(input);
        showMessage('jsonMessage', '有効なJSONです！', 'success');
    } catch (e) {
        showMessage('jsonMessage', '無効なJSON: ' + e.message, 'error');
    }
}

/* ===== 2. Diff Checker ===== */
function runDiff() {
    var textA = document.getElementById('diffInputA').value;
    var textB = document.getElementById('diffInputB').value;
    var output = document.getElementById('diffOutput');

    if (!textA && !textB) {
        output.innerHTML = '<span class="diff-unchanged">両方のテキストを入力してください。</span>';
        return;
    }

    var linesA = textA.split('\n');
    var linesB = textB.split('\n');
    var maxLen = Math.max(linesA.length, linesB.length);
    var html = '';

    for (var i = 0; i < maxLen; i++) {
        var lineA = linesA[i] !== undefined ? linesA[i] : '';
        var lineB = linesB[i] !== undefined ? linesB[i] : '';

        if (lineA === lineB && lineA !== '') {
            html += '<span class="diff-unchanged">  ' + escapeHtml(lineA) + '</span>';
        } else if (lineA === '' && lineB !== '') {
            html += '<span class="diff-added">+ ' + escapeHtml(lineB) + '</span>';
        } else if (lineB === '' && lineA !== '') {
            html += '<span class="diff-removed">- ' + escapeHtml(lineA) + '</span>';
        } else if (lineA !== lineB) {
            if (lineA) html += '<span class="diff-removed">- ' + escapeHtml(lineA) + '</span>';
            if (lineB) html += '<span class="diff-added">+ ' + escapeHtml(lineB) + '</span>';
        }
    }

    if (!html) {
        html = '<span class="diff-unchanged">差異はありません（テキストが空または同一です）。</span>';
    }

    output.innerHTML = html;
}

function swapDiff() {
    var a = document.getElementById('diffInputA').value;
    var b = document.getElementById('diffInputB').value;
    document.getElementById('diffInputA').value = b;
    document.getElementById('diffInputB').value = a;
    runDiff();
}

/* ===== 3. Base64 ===== */
function convertBase64() {
    var input = document.getElementById('base64Input').value;
    var mode = document.querySelector('input[name="base64Mode"]:checked').value;

    if (!input) {
        showMessage('base64Message', 'テキストを入力してください。', 'error');
        return;
    }

    try {
        if (mode === 'encode') {
            document.getElementById('base64Output').value = btoa(unescape(encodeURIComponent(input)));
            showMessage('base64Message', 'エンコード成功！', 'success');
        } else {
            document.getElementById('base64Output').value = decodeURIComponent(escape(atob(input)));
            showMessage('base64Message', 'デコード成功！', 'success');
        }
    } catch (e) {
        showMessage('base64Message', '変換エラー: 入力が正しい形式か確認してください。', 'error');
    }
}

/* ===== 4. URL Encode / Decode ===== */
function convertUrl() {
    var input = document.getElementById('urlInput').value;
    var mode = document.querySelector('input[name="urlMode"]:checked').value;

    if (!input) {
        showMessage(null, 'テキストを入力してください。', 'error');
        return;
    }

    try {
        if (mode === 'encode') {
            document.getElementById('urlOutput').value = encodeURIComponent(input);
        } else {
            document.getElementById('urlOutput').value = decodeURIComponent(input);
        }
    } catch (e) {
        showMessage(null, '変換エラー: ' + e.message, 'error');
    }
}

/* ===== 5. 文字数カウンター ===== */
function updateCounter() {
    var text = document.getElementById('counterInput').value;
    document.getElementById('charCount').textContent = text.length;

    var encoder = new TextEncoder();
    document.getElementById('byteCount').textContent = encoder.encode(text).length;

    var words = text.trim() ? text.trim().split(/\s+/).length : 0;
    document.getElementById('wordCount').textContent = words;

    var lines = text ? text.split('\n').length : 0;
    document.getElementById('lineCount').textContent = lines;
}

/* ===== 6. Markdown Preview ===== */
function updateMarkdownPreview() {
    var input = document.getElementById('mdInput').value;
    var preview = document.getElementById('mdPreview');
    preview.innerHTML = renderMarkdown(input);
}

function renderMarkdown(md) {
    if (!md) return '<p style="color: var(--text-muted)">プレビューがここに表示されます。</p>';

    var html = md;

    // Escape HTML tags (use entity codes via String.fromCharCode to avoid auto-formatting)
    var amp = String.fromCharCode(38);
    var lt = String.fromCharCode(60);
    var gt = String.fromCharCode(62);
    html = html.replace(new RegExp(amp, 'g'), amp + 'amp;');
    html = html.replace(new RegExp(lt, 'g'), amp + 'lt;');
    html = html.replace(new RegExp(gt, 'g'), amp + 'gt;');

    // Code blocks (fenced)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, lang, code) {
        var langClass = lang ? ' class="language-' + lang + '"' : '';
        return '<pre><code' + langClass + '>' + code.trim() + '</code></pre>';
    });

    // Headings
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');

    // Bold & Italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph if needed
    if (html.indexOf('<h') !== 0 && html.indexOf('<ul') !== 0 && html.indexOf('<ol') !== 0 &&
        html.indexOf('<pre') !== 0 && html.indexOf('<blockquote') !== 0 && html.indexOf('<hr') !== 0) {
        html = '<p>' + html + '</p>';
    }

    // Fix nested paragraphs
    html = html.replace(/<\/h1><br><p>/g, '</h1>');
    html = html.replace(/<\/h2><br><p>/g, '</h2>');
    html = html.replace(/<\/h3><br><p>/g, '</h3>');
    html = html.replace(/<\/li><br><p>/g, '</li>');
    html = html.replace(/<\/ul><br><p>/g, '</ul>');
    html = html.replace(/<\/ol><br><p>/g, '</ol>');
    html = html.replace(/<\/blockquote><br><p>/g, '</blockquote>');
    html = html.replace(/<\/pre><br><p>/g, '</pre>');
    html = html.replace(/<hr><br><p>/g, '<hr>');

    return html;
}

function copyHtmlFromMd() {
    var preview = document.getElementById('mdPreview');
    var html = preview.innerHTML;
    if (!html || html.indexOf('プレビューがここに表示されます') !== -1) {
        showMessage(null, 'コピーするHTMLがありません。', 'error');
        return;
    }
    navigator.clipboard.writeText(html).then(function() {
        showMessage(null, 'HTMLをクリップボードにコピーしました！', 'success');
    });
}

/* ===== HTML Escape Helper ===== */
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}