paths = {
    r"C:\Users\ADMIN\Internal-Document-Management-AI-Chatbot-System\src\main\resources\templates\layouts\user-layout.html": [
        ('src="/js/user/dashboard.js?v=4"', 'src="/js/user/dashboard.js?v=5"')
    ],
    r"C:\Users\ADMIN\Internal-Document-Management-AI-Chatbot-System\src\main\resources\templates\layouts\manager-layout.html": [
        ('<script src="/js/common.js?v=4"></script>', '<script src="/js/lib/marked.min.js"></script>\n  <script src="/js/lib/purify.min.js"></script>\n  <script src="/js/common.js?v=4"></script>'),
        ('src="/js/manager/dashboard.js?v=4"', 'src="/js/manager/dashboard.js?v=5"')
    ]
}

for path, replacements in paths.items():
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
        print("Patched", path)