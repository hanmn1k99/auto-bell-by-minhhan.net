import re

with open('src/components/admin/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Just use simple regex to find the button wrappers and replace them
pattern = r"""<div style=\{\{\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'0\.5rem',\s*flexShrink:\s*0\s*\}\}>[\s\S]*?<button className="btn btn-xs" onPointerDown=\{\(e\) => e\.stopPropagation\(\)\} onClick=\{\(\) => playManual\('file', f\.id\)\}[\s\S]*?</button>[\s\S]*?<button className="btn btn-xs btn-outline" onPointerDown=\{\(e\) => e\.stopPropagation\(\)\} onClick=\{\(\) => queueManual\('file', f\.id\)\}[\s\S]*?</button>\s*</div>"""

new_buttons1 = """<div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                <button className="btn btn-icon" onPointerDown={(e) => e.stopPropagation()} onClick={() => playManual('file', f.id)} style={{ color: 'var(--accent)' }} title="Phát">
                  {React.createElement('ion-icon', { name: 'play' })}
                </button>
                <button className="btn btn-icon" onPointerDown={(e) => e.stopPropagation()} onClick={() => queueManual('file', f.id)} style={{ color: '#10b981' }} title="Thêm vào hàng đợi">
                  {React.createElement('ion-icon', { name: 'add' })}
                </button>
              </div>"""

content = re.sub(pattern, new_buttons1, content)

with open('src/components/admin/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
