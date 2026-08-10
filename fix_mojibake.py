import os

files = [
    'src/main/resources/templates/layouts/user-layout.html',
    'src/main/resources/templates/layouts/manager-layout.html',
    'src/main/resources/static/js/manager/dashboard.js',
    'src/main/resources/static/js/user/dashboard.js',
    'src/main/resources/static/js/user/chat.js'
]

for file in files:
    with open(file, 'rb') as f:
        content = f.read()
    
    try:
        # It's currently UTF-8 with mojibake.
        text = content.decode('utf-8')
        # Encode as windows-1252 to get back original bytes
        original_bytes = text.encode('windows-1252')
        
        # Check if the file starts with BOM (ef bb bf)
        if original_bytes.startswith(b'\xef\xbb\xbf'):
            original_bytes = original_bytes[3:]
            
        # Decode as utf-8 to get real string, then save
        real_text = original_bytes.decode('utf-8')
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(real_text)
            
        print(f"Fixed {file}")
    except Exception as e:
        print(f"Skipped {file} or error: {e}")
