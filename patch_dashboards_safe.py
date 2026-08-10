import sys

paths = [
    r"C:\Users\ADMIN\Internal-Document-Management-AI-Chatbot-System\src\main\resources\static\js\user\dashboard.js",
    r"C:\Users\ADMIN\Internal-Document-Management-AI-Chatbot-System\src\main\resources\static\js\manager\dashboard.js"
]

replacement = '''function formatMessageContent(content, sources) {
    if (!content) return '';
    if (typeof marked === "undefined") {
        return content
            .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>1</strong>')
            .replace(/\\*(.*?)\\*/g, '<em>1</em>')
            .replace(/\\\\\\([\\s\\S]*?)\\\\\\/g, '<pre><code>1</code></pre>')
            .replace(/\\(.*?)\\/g, '<code>1</code>')
            .replace(/\\n/g, '<br>');
    }
    
    let rawHtml = marked.parse(content);
    let cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['data-index'] });
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = cleanHtml;
    
    function localEscapeHtml(str) {
        const div = document.createElement("div");
        div.innerText = str;
        return div.innerHTML;
    }
    
    function processTextNodes(node) {
        if (node.nodeType === 1) {
            const tag = node.tagName.toLowerCase();
            if (["code", "pre", "a"].includes(tag)) return;
            Array.from(node.childNodes).forEach(processTextNodes);
        } else if (node.nodeType === 3) {
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
        let excerpt = src.excerpt || "";
        
        html += '<div class="chat-source-card" data-index="' + idx + '">' +
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

    idx_start = content.find("function formatMessageContent(content) {")
    idx_end = content.find("async function sendChatMessage() {")
    
    if idx_start != -1 and idx_end != -1:
        new_content = content[:idx_start] + replacement + "\n" + content[idx_end:]
        new_content = new_content.replace('formatMessageContent(msg.content)', 'formatMessageContent(msg.content, msg.fileRefs || msg.sources)')
        new_content = new_content.replace('formatMessageContent(content)', 'formatMessageContent(content, [])')
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Patched", path)
    else:
        print("Failed to find bounds for", path)