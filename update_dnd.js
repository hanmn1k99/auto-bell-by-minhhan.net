const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// Add imports
if (!code.includes('@dnd-kit/core')) {
    code = code.replace(
        "import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';",
        "import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';\nimport { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';\nimport { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';\nimport { SortableFile } from './SortableFile';"
    );
}

// Add handleDragEnd inside Files function
const dragEndString = `
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const activeFile = files.find(f => f.id.toString() === active.id);
      const overFile = files.find(f => f.id.toString() === over.id);
      
      // Only allow reordering within the same folder
      if (activeFile && overFile && activeFile.folderId === overFile.folderId) {
        const folderFiles = files.filter(f => f.folderId === activeFile.folderId);
        const oldIndex = folderFiles.findIndex(f => f.id.toString() === active.id);
        const newIndex = folderFiles.findIndex(f => f.id.toString() === over.id);
        
        const newFolderFiles = arrayMove(folderFiles, oldIndex, newIndex);
        
        // Construct the new complete ordered IDs array
        // We only update the order for files in this folder, leaving others intact
        const orderedIds = newFolderFiles.map(f => f.id);
        
        try {
          await axios.put(\`\${API_URL}/api/files/reorder\`, { orderedIds }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
          fetchFiles();
        } catch (e) {
          console.error(e);
        }
      }
    }
  };
`;

if (!code.includes('handleDragEnd')) {
    code = code.replace(
        "const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});",
        "const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});\n" + dragEndString
    );
}

// Wrap file grids in SortableContext and DndContext
// First, wrap the return in DndContext
if (!code.includes('<DndContext')) {
    code = code.replace(
        /<div className="admin-section">/,
        `<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>\n      <div className="admin-section">`
    );
    code = code.replace(
        /<\/div>\s*\)\;\s*\}\;\s*$/,
        `      </div>\n      </DndContext>\n    );\n  };\n`
    );
}

// Modify renderFile to return <SortableFile>
// Need to extract the key from the inner div to SortableFile
code = code.replace(
    /return \(\s*<div key=\{f\.id\} className=\{\`file-item/,
    `return (\n      <SortableFile id={f.id.toString()} key={f.id}>\n        <div className={\`file-item`
);
code = code.replace(
    /<\/button>\s*<\/div>\s*<\/div>\s*\);\s*\};/,
    `</button>\n        </div>\n      </div>\n      </SortableFile>\n    );\n  };`
);

// Modify grids to be SortableContext
code = code.replace(
    /<div style=\{\{ padding: '0\.75rem', display: 'grid', gridTemplateColumns: 'repeat\(auto-fill, minmax\(320px, 1fr\)\)', gap: '0\.5rem' \}\}>\s*\{folderFiles\.map\(renderFile\)\}\s*<\/div>/g,
    `<SortableContext items={folderFiles.map(f => f.id.toString())} strategy={rectSortingStrategy}>\n                        <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>\n                          {folderFiles.map(renderFile)}\n                        </div>\n                      </SortableContext>`
);

code = code.replace(
    /<div style=\{\{ padding: '0\.75rem', display: 'grid', gridTemplateColumns: 'repeat\(auto-fill, minmax\(320px, 1fr\)\)', gap: '0\.5rem' \}\}>\s*\{unassignedFiles\.map\(renderFile\)\}\s*<\/div>/g,
    `<SortableContext items={unassignedFiles.map(f => f.id.toString())} strategy={rectSortingStrategy}>\n                        <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>\n                          {unassignedFiles.map(renderFile)}\n                        </div>\n                      </SortableContext>`
);

code = code.replace(
    /<div style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fill, minmax\(320px, 1fr\)\)', gap: '0\.5rem' \}\}>\s*\{files\.filter\(f => selectedFolderId === 'unassigned' \? !f\.folderId : f\.folderId === selectedFolderId\)\.map\(renderFile\)\}\s*<\/div>/g,
    `{(() => {
                  const filtered = files.filter(f => selectedFolderId === 'unassigned' ? !f.folderId : f.folderId === selectedFolderId);
                  return (
                    <SortableContext items={filtered.map(f => f.id.toString())} strategy={rectSortingStrategy}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>
                        {filtered.map(renderFile)}
                      </div>
                    </SortableContext>
                  );
                })()}`
);

// Prevent pointer events on buttons while dragging? (handled by SortableFile using listeners)
// Wait, the input checkbox and buttons inside SortableFile will trigger drag if we don't prevent it or if we don't use a drag handle.
// By default, the whole item is a drag handle. Clicking buttons might trigger drag, but `activationConstraint: { distance: 5 }` prevents clicks from being treated as drags.

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");