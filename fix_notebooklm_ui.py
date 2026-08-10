import re
import os

def clean_file(path, is_chat_js=False):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Clean mojibake at the top
    content = re.sub(r'user-dashboard\.js \?" IDMS User Dashboard \(\?A SA\)', 'user-dashboard.js - IDMS User Dashboard', content)
    content = re.sub(r'manager-dashboard\.js \?" IDMS Manager Dashboard \(\?A SA\)', 'manager-dashboard.js - IDMS Manager Dashboard', content)
    
    # 2. Remove renderFileRefs calls
    content = content.replace(r'', '')
    
    # 3. Remove renderFileRefs function
    content = re.sub(r'function renderFileRefs\(refs\) \{.*?\}(?=\s*async function sendChatMessage|function|const)', '', content, flags=re.DOTALL)
    
    # 4. Remove duplicate initCitationPopover
    popover_block = r'// ===== NOTEBOOKLM CITATION POPOVER =====.*?popover\.style\.left = Math\.max\(10, rect\.left - 130\) \+ \'px\';\s+popover\.style\.top = \(rect\.top - popoverHeight - 10\) \+ \'px\';\s+if \(rect\.top - popoverHeight - 10 < 0\) \{\s+popover\.style\.top = \(rect\.bottom \+ 10\) \+ \'px\';\s+\}\s+\}'
    matches = list(re.finditer(popover_block, content, re.DOTALL))
    if len(matches) > 1:
        # Keep only the first one
        first_match = matches[0]
        content = content[:first_match.end()] + re.sub(popover_block, '', content[first_match.end():], flags=re.DOTALL)
        
    # 5. Fix chat.js missing markdown parsing
    if is_chat_js:
        # Check if it has formatMessageContent
        if 'function formatMessageContent' not in content:
            # Add it
            format_func = '''
function formatMessageContent(content, sources) {
    if (!content) return '';
    if (typeof marked === "undefined") {
        return content.replace(/\\*\\*(.*?)\\*\\*/g, '<strong></strong>').replace(/\\n/g, '<br>');
    }
    let rawHtml = marked.parse(content);
    let cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['data-index', 'onmouseenter', 'onmouseleave'] });
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = cleanHtml;
    
    function processTextNodes(node) {
        if (node.nodeType === 1) {
            const tag = node.tagName.toLowerCase();
            if (["code", "pre", "a"].includes(tag)) return;
            Array.from(node.childNodes).forEach(processTextNodes);
        } else if (node.nodeType === 3) {
            if (/\\[(\\d+)\\]/.test(node.nodeValue)) {
                const spanWrapper = document.createElement('span');
                const escapedText = node.nodeValue;
                spanWrapper.innerHTML = escapedText.replace(/\\[(\\d+)\\]/g, function(m, numStr) {
                    const num = parseInt(numStr, 10);
                    if (sources && sources[num]) {
                        const source = sources[num];
                        const title = source.fileName || "Tài liệu";
                        const excerpt = source.excerpt || "";
                        const t = title.replace(/'/g, "\\\\\\'").replace(/"/g, '&quot;');
                        const e = excerpt.replace(/'/g, "\\\\\\'").replace(/"/g, '&quot;');
                        return '<span class="citation-badge" data-index="' + num + '" ' +
                            'onmouseenter="if(window.showCitationPopover) window.showCitationPopover(this, \\'' + t + '\\', \\'' + e + '\\')" ' +
                            'onmouseleave="if(window.hideCitationPopover) window.hideCitationPopover()">' + (num + 1) + '</span>';
                    }
                    return m;
                });
                node.replaceWith(...spanWrapper.childNodes);
            }
        }
    }
    Array.from(tempDiv.childNodes).forEach(processTextNodes);
    return tempDiv.innerHTML;
}
'''
            content += format_func
            
        # Replace appendMessageBubble
        old_append = '''function appendMessageBubble(role, content, createdAt) {
    const isUser = String(role).toUpperCase() === "USER";
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message " + (isUser ? "user" : "assistant");
    wrapper.innerHTML =
      '<div class="chat-message-avatar">' +
      (isUser ? "🧑" : "🤖") +
      "</div>" +
      '<div class="chat-message-content">' +
      '  <div class="chat-message-text">' +
      escapeHtml(content) +
      "</div>" +
      '  <div class="chat-message-time">' +
      formatTime(createdAt) +
      "</div>" +
      "</div>";
    messageListEl.appendChild(wrapper);
  }'''
        new_append = '''function appendMessageBubble(role, content, createdAt, sources) {
    const isUser = String(role).toUpperCase() === "USER";
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message " + (isUser ? "user" : "assistant");
    
    // Parse markdown for assistant messages
    const finalContent = isUser ? escapeHtml(content) : formatMessageContent(content, sources);
    
    wrapper.innerHTML =
      '<div class="chat-message-avatar">' +
      (isUser ? "🧑" : "🤖") +
      "</div>" +
      '<div class="chat-message-content">' +
      '  <div class="chat-message-text">' +
      finalContent +
      "</div>" +
      '  <div class="chat-message-time">' +
      formatTime(createdAt) +
      "</div>" +
      "</div>";
    messageListEl.appendChild(wrapper);
  }'''
        if old_append in content:
            content = content.replace(old_append, new_append)
            
        # Update loadMessages to pass msg.sources
        content = content.replace('appendMessageBubble(msg.role, msg.content, msg.createdAt);', 'appendMessageBubble(msg.role, msg.content, msg.createdAt, msg.sources || msg.fileRefs);')
        
        # Update askQuestion to pass data.sources
        content = content.replace('appendMessageBubble("ASSISTANT", data.answer, new Date().toISOString());', 'appendMessageBubble("ASSISTANT", data.answer, new Date().toISOString(), data.sources);')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

clean_file('src/main/resources/static/js/user/dashboard.js')
clean_file('src/main/resources/static/js/manager/dashboard.js')
clean_file('src/main/resources/static/js/user/chat.js', is_chat_js=True)
print("Done fixing NotebookLM UI logic.")
