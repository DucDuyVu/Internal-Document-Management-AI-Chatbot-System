import sys
import re

def fix_layout(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add libraries
    old_lib = '<script src="/js/common.js?v=4"></script>'
    new_lib = '<script src="/js/lib/marked.min.js"></script>\n  <script src="/js/lib/purify.min.js"></script>\n  <script src="/js/common.js?v=4"></script>'
    if old_lib in content:
        content = content.replace(old_lib, new_lib)

    # Bump version
    content = content.replace('dashboard.js?v=4', 'dashboard.js?v=7')
    content = content.replace('dashboard.js?v=5', 'dashboard.js?v=7')
    content = content.replace('dashboard.js?v=6', 'dashboard.js?v=7')

    # Fix syntax error caused by Mojibake
    mojibake = "KhA'ng cA3 thA'ng bAo m>i"
    if mojibake in content:
        content = content.replace(mojibake, "Không có thông báo mới")
    
    mojibake2 = "KhA'ng cA3 thA'ng bAo m>i"
    if mojibake2 in content:
        content = content.replace(mojibake2, "Không có thông báo mới")

    # Fix duplicated lines in manager-layout.html
    bad_html = '''                <div style="font-size:0.8rem; color:#64748b; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;"></div>
                </div >
          ).join('');'''
    if bad_html in content:
        content = content.replace(bad_html, '')
        
    bad_html2 = '''<div style="font-size:0.8rem; color:#64748b; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;"></div>
                </div >
          ).join('');'''
    if bad_html2 in content:
        content = content.replace(bad_html2, '')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_layout('src/main/resources/templates/layouts/manager-layout.html')
fix_layout('src/main/resources/templates/layouts/user-layout.html')

print("Fixed layout files")
