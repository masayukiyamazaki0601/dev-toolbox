/* ===== DevToolBox - Application Logic v2.1 ===== */
/* global ClipboardItem */

document.addEventListener('DOMContentLoaded', function () {
    initToolNavigation();
    updateMarkdownPreview();
    updateCounter();
    initKeyboardShortcuts();
    initPasteAutoFormat();
});

/* ===== Tool Navigation ===== */
function initToolNavigation() {
    var navBtns = document.querySelectorAll('.tool-nav-btn');
    navBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var tool = this.dataset.tool;
            navBtns.forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            document.querySelectorAll('.tool-panel').forEach(function (p) { p.classList.remove('active'); });
            var panel = document.getElementById('panel-' + tool);
            if (panel) panel.classList.add('active');
        });
    });
}

/* ===== Keyboard Shortcuts ===== */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            var activePanel = document.querySelector('.tool-panel.active');
            if (!activePanel) return;
            var id = activePanel.id;
            var actions = {
                'panel-json': formatJSON,
                'panel-diff': runDiff,
                'panel-base64': convertBase64,
                'panel-url': convertUrl
            };
            if (actions[id]) actions[id]();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'l' && !e.target.closest('.tool-textarea')) {
            e.preventDefault();
            var activePanel = document.querySelector('.tool-panel.active');
            if (!activePanel) return;
            var textareas = activePanel.querySelectorAll('.tool-textarea');
            var ids = [];
            textareas.forEach(function (ta) { ids.push(ta.id); });
            if (ids.length) clearTool.apply(null, ids);
        }
    });
}

/* ===== Paste Auto-Format (JSON) ===== */
function initPasteAutoFormat() {
    var jsonInput = document.getElementById('jsonInput');
    if (!jsonInput) return;
    jsonInput.addEventListener('paste', function () {
        setTimeout(function () {
            var val = jsonInput.value.trim();
            if (!val) return;
            if ((val.charAt(0) === '{' && val.charAt(val.length - 1) === '}') ||
                (val.charAt(0) === '[' && val.charAt(val.length - 1) === ']')) {
                try {
                    var parsed = JSON.parse(val);
                    jsonInput.value = JSON.stringify(parsed, null, 2);
                } catch (e) {
                    // not valid JSON
                }
            }
        }, 50);
    });
}

/* ===== Utility Functions ===== */
function copyResult(elementId) {
    var el = document.getElementById(elementId);
    if (!el || (!el.value && !el.innerText)) {
        showMessage(null, 'コピーする内容がありません。', 'error');
        return;
    }
    var text = el.value || el.innerText;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
            showMessage(null, 'クリップボードにコピーしました！', 'success');
        }).catch(function () {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showMessage(null, 'クリップボードにコピーしました！', 'success');
    } catch (e) {
        showMessage(null, 'コピーに失敗しました。', 'error');
    }
    document.body.removeChild(ta);
}

function clearTool() {
    var ids = Array.prototype.slice.call(arguments);
    ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'TEXTAREA') {
            el.value = '';
        } else if (el.classList.contains('diff-output')) {
            el.innerHTML = '';
        } else if (el.classList.contains('md-preview')) {
            el.innerHTML = '';
        } else if (el.classList.contains('tool-message')) {
            el.className = 'tool-message';
            el.textContent = '';
        }
    });
    if (ids.indexOf('counterInput') !== -1) updateCounter();
    if (ids.indexOf('mdInput') !== -1) updateMarkdownPreview();
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
    msgEl._hideTimer = setTimeout(function () {
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

/* ===== 2. Diff Checker (LCS-based) ===== */
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
    var lcs = computeLCS(linesA, linesB);
    var html = renderDiff(linesA, linesB, lcs);
    output.innerHTML = html || '<span class="diff-unchanged">差異はありません。</span>';
}

function computeLCS(a, b) {
    var m = a.length, n = b.length;
    var dp = [];
    for (var i = 0; i <= m; i++) {
        dp[i] = [];
        for (var j = 0; j <= n; j++) {
            dp[i][j] = 0;
        }
    }
    for (var i = 1; i <= m; i++) {
        for (var j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    var result = [];
    var i = m, j = n;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            result.unshift({ aIdx: i - 1, bIdx: j - 1 });
            i--; j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }
    return result;
}

function renderDiff(a, b, lcs) {
    var html = '';
    var ai = 0, bi = 0, li = 0;

    while (ai < a.length || bi < b.length) {
        if (li < lcs.length && ai === lcs[li].aIdx && bi === lcs[li].bIdx) {
            var line = a[ai];
            html += '<span class="diff-unchanged">  ' + escapeHtml(line) + '</span>';
            ai++; bi++; li++;
        } else {
            var inLCS = false;
            for (var k = li; k < lcs.length; k++) {
                if (lcs[k].aIdx === ai) {
                    inLCS = true;
                    break;
                }
            }
            if (!inLCS && ai < a.length) {
                html += '<span class="diff-removed">- ' + escapeHtml(a[ai]) + '</span>';
                ai++;
                continue;
            }
            inLCS = false;
            for (var k = li; k < lcs.length; k++) {
                if (lcs[k].bIdx === bi) {
                    inLCS = true;
                    break;
                }
            }
            if (!inLCS && bi < b.length) {
                html += '<span class="diff-added">+ ' + escapeHtml(b[bi]) + '</span>';
                bi++;
                continue;
            }
            if (ai < a.length && bi < b.length) {
                html += '<span class="diff-removed">- ' + escapeHtml(a[ai]) + '</span>';
                html += '<span class="diff-added">+ ' + escapeHtml(b[bi]) + '</span>';
                ai++; bi++;
            } else if (ai < a.length) {
                html += '<span class="diff-removed">- ' + escapeHtml(a[ai]) + '</span>';
                ai++;
            } else if (bi < b.length) {
                html += '<span class="diff-added">+ ' + escapeHtml(b[bi]) + '</span>';
                bi++;
            }
        }
    }
    return html;
}

function swapDiff() {
    var a = document.getElementById('diffInputA').value;
    var b = document.getElementById('diffInputB').value;
    document.getElementById('diffInputA').value = b;
    document.getElementById('diffInputB').value = a;
    runDiff();
}

/* ===== 3. Base64 (Unicode-safe) ===== */
function convertBase64() {
    var input = document.getElementById('base64Input').value;
    var mode = document.querySelector('input[name="base64Mode"]:checked').value;

    if (!input) {
        showMessage('base64Message', 'テキストを入力してください。', 'error');
        return;
    }

    try {
        if (mode === 'encode') {
            document.getElementById('base64Output').value = base64EncodeUnicode(input);
            showMessage('base64Message', 'エンコード成功！', 'success');
        } else {
            document.getElementById('base64Output').value = base64DecodeUnicode(input);
            showMessage('base64Message', 'デコード成功！', 'success');
        }
    } catch (e) {
        showMessage('base64Message', '変換エラー: 入力が正しい形式か確認してください。', 'error');
    }
}

function base64EncodeUnicode(str) {
    var utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
    });
    return btoa(utf8Bytes);
}

function base64DecodeUnicode(str) {
    var bytes = atob(str);
    var percentEncoded = '';
    for (var i = 0; i < bytes.length; i++) {
        var code = bytes.charCodeAt(i);
        var hex = code.toString(16).toUpperCase();
        if (hex.length === 1) hex = '0' + hex;
        percentEncoded += '%' + hex;
    }
    return decodeURIComponent(percentEncoded);
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

    // Use hex entity approach to prevent auto-format corruption
    var A = String.fromCharCode(38); // &
    var L = String.fromCharCode(60); // <
    var G = String.fromCharCode(62); // >

    var html = md;

    // Escape HTML entities
    html = html.replace(new RegExp(A.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'), A + 'amp;');
    html = html.replace(new RegExp(L.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'), A + 'lt;');
    html = html.replace(new RegExp(G.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'), A + 'gt;');

    // Fenced code blocks
    html = html.replace(/```(\w*)\s*\n([\s\S]*?)```/g, function (match, lang, code) {
        var langClass = lang ? ' class="language-' + lang + '"' : '';
        return '<pre><code' + langClass + '>' + code.trim() + '</code></pre>';
    });

    // Headings
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = html.replace(/^[*+-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>\n?)+/g, function (match) {
        return '<ul>' + match + '</ul>';
    });

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, function (match, content) {
        return '<li value="' + match.match(/^\d+/)[0] + '">' + content + '</li>';
    });
    html = html.replace(/(<li value=".*?<\/li>\n?)+/g, function (match) {
        return '<ol>' + match + '</ol>';
    });

    // Bold & Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Paragraphs and line breaks
    var blocks = html.split(/\n\n+/);
    var result = '';
    var blockLevelTags = ['<h1', '<h2', '<h3', '<h4', '<ul', '<ol', '<li', '<pre', '<blockquote', '<hr', '<p'];

    for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i].trim();
        if (!block) continue;

        var isBlockLevel = false;
        for (var t = 0; t < blockLevelTags.length; t++) {
            if (block.indexOf(blockLevelTags[t]) === 0) {
                isBlockLevel = true;
                break;
            }
        }

        if (isBlockLevel) {
            result += block;
        } else {
            block = block.replace(/\n/g, '<br>');
            result += '<p>' + block + '</p>';
        }
    }

    return result;
}

function copyHtmlFromMd() {
    var preview = document.getElementById('mdPreview');
    var html = preview.innerHTML;
    if (!html || html.indexOf('プレビューがここに表示されます') !== -1) {
        showMessage(null, 'コピーするHTMLがありません。', 'error');
        return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(html).then(function () {
            showMessage(null, 'HTMLをクリップボードにコピーしました！', 'success');
        });
    } else {
        fallbackCopy(html);
    }
}

/* ===== HTML Escape Helper ===== */
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}