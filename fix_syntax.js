const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

const fixRegex = /\{selectedFolderId !== 'all' \? \(\s*\{\(\(\) => \{[\s\S]*?\}\)\(\)\}\s*\) : \(/;

const correctStr = `{selectedFolderId !== 'all' ? (() => {
                  const filtered = files.filter(f => selectedFolderId === 'unassigned' ? !f.folderId : f.folderId === selectedFolderId);
                  return (
                    <SortableContext items={filtered.map(f => f.id.toString())} strategy={rectSortingStrategy}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>
                        {filtered.map(renderFile)}
                      </div>
                    </SortableContext>
                  );
                })() : (`

code = code.replace(fixRegex, correctStr);

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");