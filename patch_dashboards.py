import re
import os

paths = [
    r"C:\Users\ADMIN\Internal-Document-Management-AI-Chatbot-System\src\main\resources\static\js\user\dashboard.js",
    r"C:\Users\ADMIN\Internal-Document-Management-AI-Chatbot-System\src\main\resources\static\js\manager\dashboard.js"
]

replacement = '''function formatMessageContent(content, sources) {
    if (!content) return '';
    
    // Nếu chưa có marked, fallback về logic cũ (dự phòng)
    if (typeof marked === "undefined") {
        return content
            .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>\</strong>')
            .replace(/\\*(.*?)\\*/g, '<em>\</em>')
            .replace(/\\\([\\s\\S]*?)\\\/g, '<pre><code>\</code></pre>')
            .replace(/\(.*?)\/g, '<code>\</code>')
            .replace(/\\n/g, '<br>');
    }

    // 1. Parse Markdown sang HTML
    let rawHtml = marked.parse(content);

    // 2. Sanitize với DOMPurify
    let cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['data-index'] });

    // 3. Thay thế [n] bằng badge trong các text node (bỏ qua code block)
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = cleanHtml;

    function localEscapeHtml(str) {
        const div = document.createElement("div");
        div.innerText = str;
        return div.innerHTML;
    }

    function processTextNodes(node) {
        if (node.nodeType === 1) { // Element
            const tag = node.tagName.toLowerCase();
            if (["code", "pre", "a"].includes(tag)) return;
            Array.from(node.childNodes).forEach(processTextNodes);
        } else if (node.nodeType === 3) { // Text
            if (/\\[(\\d+)\\]/.test(node.nodeValue)) {
                const spanWrapper = document.createElement('span');
                const escapedText = localEscapeHtml(node.nodeValue);
                spanWrapper.innerHTML = escapedText.replace(/\\[(\\d+)\\]/g, function(m, numStr) {
                    const num = parseInt(numStr, 10);
                    if (sources && sources[num]) {
                        const source = sources[num];
                        const tooltip = localEscapeHtml(source.fileName || source.documentName || "Tài liệu");
                        return '<span class="citation-badge" data-index="' + num + '" title="' + tooltip + '">' + (num + 1) + '</span>';
                    }
                    return m;
                });
                node.replaceWith(...spanWrapper.childNodes);
            }
        }
    }
    
    processTextNodes(tempDiv);
    return tempDiv.innerHTML;
}

function renderFileRefs(refs) {
    if (!refs || refs.length === 0) return '';
    
    let html = '<div class="chat-sources"><div class="chat-sources-title">Nguồn tham khảo</div><div class="chat-sources-list">';
    refs.forEach(function(src, idx) {
        let name = src.fileName || src.documentName || "Tài liệu";
        // prevent script injection just in case
        name = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        let excerpt = src.excerpt || "";
        excerpt = excerpt.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        html += 
            '<div class="chat-source-card" data-index="' + idx + '">' +
                '<div class="chat-source-header">' +
                    '<span class="chat-source-number">' + (idx + 1) + '</span>' +
                    '<span class="chat-source-filename">' + name + '</span>' +
                '</div>' +
                '<div class="chat-source-excerpt">' + excerpt + '</div>' +
            '</div>';
    });
    html += '</div></div>';
    return html;
}
'''

for path in paths:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the bounds
    start_str = "function formatMessageContent(content) {"
    end_str = "async function sendChatMessage() {"
    
    idx_start = content.find(start_str)
    idx_end = content.find(end_str)
    
    if idx_start != -1 and idx_end != -1:
        new_content = content[:idx_start] + replacement + "\n" + content[idx_end:]
        
        # also update formatMessageContent(msg.content) to formatMessageContent(msg.content, refs)
        new_content = new_content.replace('formatMessageContent(msg.content)', 'formatMessageContent(msg.content, refs)')
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Patched", path)
    else:
        print("Could not find bounds in", path)
