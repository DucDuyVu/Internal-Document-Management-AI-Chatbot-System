import sys

paths = [
    r"C:\Users\ADMIN\Internal-Document-Management-AI-Chatbot-System\src\main\resources\static\js\user\dashboard.js",
    r"C:\Users\ADMIN\Internal-Document-Management-AI-Chatbot-System\src\main\resources\static\js\manager\dashboard.js"
]

for path in paths:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = content.replace("<strong>\\</strong>", "<strong></strong>")
    new_content = new_content.replace("<em>\\</em>", "<em></em>")
    new_content = new_content.replace("<pre><code>\\</code></pre>", "<pre><code></code></pre>")
    new_content = new_content.replace("<code>\\</code>", "<code></code>")

    # Fix the missing backticks in the python script 
    new_content = new_content.replace(r"/\\\\([\\s\\S]*?)\\\\/g", r"/`([\s\S]*?)`/g")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

print("Fixed ")