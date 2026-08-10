import sys
import re

file_path = "src/main/resources/static/js/user/chat.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_badge = '''const tooltip = escapeHtml(source.fileName || "Tài liệu");
                    return '<span class="citation-badge" data-index="' + num + '" title="' + tooltip + '">' + (num + 1) + '</span>';'''

new_badge = '''const title = source.fileName || source.documentName || "Tài liệu";
                    const excerpt = source.excerpt || "";
                    const t = title.replace(/'/g, "\\\\\\'").replace(/"/g, '&quot;');
                    const e = excerpt.replace(/'/g, "\\\\\\'").replace(/"/g, '&quot;');
                    return '<span class="citation-badge" data-index="' + num + '" ' +
                        'onmouseenter="showCitationPopover(this, \\'' + t + '\\', \\'' + e + '\\')" ' +
                        'onmouseleave="hideCitationPopover()">' + (num + 1) + '</span>';'''

popover_js = '''
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

# Use regex to find and replace
content = re.sub(r'const tooltip = escapeHtml\(source\.fileName \|\| "Tài liệu"\);\s*return \'<span class="citation-badge" data-index="\' \+ num \+ \'" title="\' \+ tooltip \+ \'">\' \+ \(num \+ 1\) \+ \'</span>\';', new_badge, content)

content += popover_js

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated user/chat.js")
