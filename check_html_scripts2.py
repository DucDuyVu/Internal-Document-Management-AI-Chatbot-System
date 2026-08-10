import re
import subprocess
import os

for html_file in ['src/main/resources/templates/user/dashboard.html', 'src/main/resources/templates/manager/dashboard.html']:
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
    for i, script_content in enumerate(scripts):
        with open('temp2.js', 'w', encoding='utf-8') as f:
            f.write(script_content)
        result = subprocess.run(['node', '-c', 'temp2.js'], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error in {html_file} script {i}:\n{result.stderr}")
        else:
            print(f"OK {html_file} script {i}")

if os.path.exists('temp2.js'):
    os.remove('temp2.js')
