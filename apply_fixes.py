import os
import re

def update_file(path, old, new):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {path}")
    else:
        print(f"Old text not found in {path}")

# 1. Update Layouts to include marked and purify
layout_old = '<script src="/js/common.js?v=4"></script>'
layout_new = '<script src="/js/lib/marked.min.js"></script>\n  <script src="/js/lib/purify.min.js"></script>\n  <script src="/js/common.js?v=4"></script>'
update_file('src/main/resources/templates/layouts/manager-layout.html', layout_old, layout_new)
update_file('src/main/resources/templates/layouts/user-layout.html', layout_old, layout_new)

# 2. Update formatMessageContent in dashboard.js
dash_old_format = '''function formatMessageContent(content) {
    if (!content) return '';
    // Convert markdown-like syntax
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong></strong>')
        .replace(/\*(.*?)\*/g, '<em></em>')
        .replace(/`([\s\S]*?)`/g, '<pre><code></code></pre>')
        .replace(/(.*?)/g, '<code></code>')
        .replace(/\\n/g, '<br>');
}'''
dash_new_format = '''function formatMessageContent(content, sources) {
    if (!content) return '';
    if (typeof marked === "undefined") {
        return content
            .replace(/\\*\\*(.*?)\\*\\*/g, '<strong></strong>')
            .replace(/\\*(.*?)\\*/g, '<em></em>')
            .replace(/`([\\s\\S]*?)`/g, '<pre><code></code></pre>')
            .replace(/(.*?)/g, '<code></code>')
            .replace(/\\n/g, '<br>');
    }
    
    let rawHtml = marked.parse(content);
    let cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['data-index'] });
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = cleanHtml;
    
    function processTextNodes(node) {
        if (node.nodeType === 1) { // Element
            const tag = node.tagName.toLowerCase();
            if (["code", "pre", "a"].includes(tag)) return; // Khong thay the trong code
            Array.from(node.childNodes).forEach(processTextNodes);
        } else if (node.nodeType === 3) { // Text
            if (/\\[(\\d+)\\]/.test(node.nodeValue)) {
                const spanWrapper = document.createElement('span');
                const escapedText = node.nodeValue; // It's already text node, no need to escape html tags here
                
                spanWrapper.innerHTML = escapedText.replace(/\\[(\\d+)\\]/g, function(m, numStr) {
                    const num = parseInt(numStr, 10);
                    if (sources && sources[num]) {
                        const source = sources[num];
                        const title = source.fileName || source.documentName || "Tai lieu";
                        const excerpt = source.excerpt || "";
                        // Encode quotes for inline event handler
                        const t = title.replace(/'/g, "\\\\\\'").replace(/"/g, '&quot;');
                        const e = excerpt.replace(/'/g, "\\\\\\'").replace(/"/g, '&quot;');
                        return '<span class="citation-badge" data-index="' + num + '" ' +
                            'onmouseenter="showCitationPopover(this, \\'' + t + '\\', \\'' + e + '\\')" ' +
                            'onmouseleave="hideCitationPopover()">' + (num + 1) + '</span>';
                    }
                    return m;
                });
                node.replaceWith(...spanWrapper.childNodes);
            }
        }
    }
    Array.from(tempDiv.childNodes).forEach(processTextNodes);
    return tempDiv.innerHTML;
}'''

update_file('src/main/resources/static/js/manager/dashboard.js', dash_old_format, dash_new_format)
update_file('src/main/resources/static/js/user/dashboard.js', dash_old_format, dash_new_format)

# 3. Update renderChatMessages fallback
render_old = '''container.innerHTML = messages.map(msg => 
        <div class="chat-message ">
            <div class="chat-message-avatar">
                
            </div>
            <div class="chat-message-content">
                <div class="chat-message-text"></div>
                
                <div class="chat-message-time"></div>
            </div>
        </div>
    ).join('');'''

render_new = '''container.innerHTML = messages.map(msg => {
        const refs = msg.fileRefs || msg.sources;
        return 
        <div class="chat-message ">
            <div class="chat-message-avatar">
                
            </div>
            <div class="chat-message-content">
                <div class="chat-message-text"></div>
                
                <div class="chat-message-time"></div>
            </div>
        </div>
        ;
    }).join('');'''

update_file('src/main/resources/static/js/manager/dashboard.js', render_old, render_new)
update_file('src/main/resources/static/js/user/dashboard.js', render_old, render_new)

# Also handle if it had the old parameter passed
render_old_2 = render_old.replace('formatMessageContent(msg.content)', 'formatMessageContent(msg.content, msg.fileRefs || msg.sources)')
update_file('src/main/resources/static/js/manager/dashboard.js', render_old_2, render_new)
update_file('src/main/resources/static/js/user/dashboard.js', render_old_2, render_new)

# 4. Append Popover JS
popover_js = '''\n
// ===== NOTEBOOKLM CITATION POPOVER =====
function initCitationPopover() {
    if (document.getElementById('citation-popover')) return;
    const popover = document.createElement('div');
    popover.id = 'citation-popover';
    popover.className = 'citation-popover';
    popover.innerHTML = 
        <div class='citation-popover-title'><i class='fa-solid fa-file-lines'></i> <span id='citation-popover-title-text'></span></div>
        <div id='citation-popover-excerpt' class='citation-popover-excerpt'></div>
    ;
    document.body.appendChild(popover);
}

window.showCitationPopover = function(element, title, excerpt) {
    const popover = document.getElementById('citation-popover');
    if (!popover) return;
    document.getElementById('citation-popover-title-text').textContent = title;
    document.getElementById('citation-popover-excerpt').textContent = '"' + excerpt + '"';
    
    const rect = element.getBoundingClientRect();
    popover.style.display = 'block';
    const popoverHeight = popover.offsetHeight;
    
    popover.style.left = Math.max(10, rect.left - 130) + 'px';
    popover.style.top = (rect.top - popoverHeight - 10) + 'px';
    
    if (rect.top - popoverHeight - 10 < 0) {
        popover.style.top = (rect.bottom + 10) + 'px';
    }
    
    requestAnimationFrame(() => {
        popover.classList.add('visible');
    });
};

window.hideCitationPopover = function() {
    const popover = document.getElementById('citation-popover');
    if (popover) {
        popover.classList.remove('visible');
        setTimeout(() => {
            if (!popover.classList.contains('visible')) {
                popover.style.display = 'none';
            }
        }, 200);
    }
};

document.addEventListener('DOMContentLoaded', initCitationPopover);
'''

with open('src/main/resources/static/js/manager/dashboard.js', 'a', encoding='utf-8') as f:
    f.write(popover_js)
with open('src/main/resources/static/js/user/dashboard.js', 'a', encoding='utf-8') as f:
    f.write(popover_js)
with open('src/main/resources/static/js/user/chat.js', 'a', encoding='utf-8') as f:
    f.write(popover_js)

print("Appended popover")

# 5. Fix user/chat.js regex
chat_js_path = 'src/main/resources/static/js/user/chat.js'
with open(chat_js_path, 'r', encoding='utf-8') as f:
    chat_content = f.read()

chat_old = '''const tooltip = escapeHtml(source.fileName || "Tài liệu");
                      return '<span class="citation-badge" data-index="' + num + '" title="' + tooltip + '">' + (num + 1) + '</span>';'''
chat_new = '''const title = source.fileName || source.documentName || "Tài liệu";
                      const excerpt = source.excerpt || "";
                      const t = title.replace(/'/g, "\\\\\\'").replace(/"/g, '&quot;');
                      const e = excerpt.replace(/'/g, "\\\\\\'").replace(/"/g, '&quot;');
                      return '<span class="citation-badge" data-index="' + num + '" ' +
                          'onmouseenter="showCitationPopover(this, \\'' + t + '\\', \\'' + e + '\\')" ' +
                          'onmouseleave="hideCitationPopover()">' + (num + 1) + '</span>';'''
if chat_old in chat_content:
    chat_content = chat_content.replace(chat_old, chat_new)
    with open(chat_js_path, 'w', encoding='utf-8') as f:
        f.write(chat_content)
    print("Updated user/chat.js regex")
else:
    print("Failed to update user/chat.js regex, trying alternate old text")
    chat_old2 = '''const tooltip = escapeHtml(source.fileName || "Tài liệu");\n                      return '<span class="citation-badge" data-index="' + num + '" title="' + tooltip + '">' + (num + 1) + '</span>';'''
    # wait let me just use regex replace for it
    import re
    chat_content = re.sub(r'const tooltip = escapeHtml.*?return.*?</span>\';', chat_new, chat_content, flags=re.DOTALL)
    with open(chat_js_path, 'w', encoding='utf-8') as f:
        f.write(chat_content)
    print("Updated user/chat.js via regex")

