const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// 1. In renderFile, change `<SortableFile id={f.id.toString()}` to `<SortableFile id={'file-' + f.id}`
code = code.replace(/<SortableFile id=\{f\.id\.toString\(\)\}/g, `<SortableFile id={'file-' + f.id}`);

// 2. In SortableContext items map, change `f.id.toString()` to `'file-' + f.id`
code = code.replace(/items=\{folderFiles\.map\(f => f\.id\.toString\(\)\)\}/g, `items={folderFiles.map(f => 'file-' + f.id)}`);
code = code.replace(/items=\{unassignedFiles\.map\(f => f\.id\.toString\(\)\)\}/g, `items={unassignedFiles.map(f => 'file-' + f.id)}`);
code = code.replace(/items=\{filtered\.map\(f => f\.id\.toString\(\)\)\}/g, `items={filtered.map(f => 'file-' + f.id)}`);

// 3. Replace the folders.map in selectedFolderId === 'all'
// We need to wrap it in SortableContext and use DroppableFolder
const oldFolderMapRegex = /\{folders\.map\(folder => \(\s*<div\s*key=\{folder\.id\}\s*className=\{`btn btn-sm[^>]*>\s*\{React\.createElement\('ion-icon', \{ name: 'folder' \}\)\} \{folder\.name\}\s*<div[^>]*>\s*<span[^>]*>[^<]*\{React\.createElement\('ion-icon', \{ name: 'pencil' \}\)\}\s*<\/span>\s*<span[^>]*>[^<]*\{React\.createElement\('ion-icon', \{ name: 'trash' \}\)\}\s*<\/span>\s*<\/div>\s*<\/div>\s*\)\}/;

const newFolderMap = `<SortableContext items={folders.map(f => 'folder-' + f.id)} strategy={rectSortingStrategy}>
                  {folders.map(folder => (
                    <DroppableFolder 
                      key={folder.id} 
                      id={folder.id.toString()}
                      isSortable={true}
                      isActive={selectedFolderId === folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      name={folder.name}
                      onRename={() => renameFolder(folder.id, folder.name)}
                      onDelete={() => deleteFolder(folder.id)}
                    />
                  ))}
                </SortableContext>`;

code = code.replace(oldFolderMapRegex, newFolderMap);

// Also replace the "Tất cả" and "Chưa phân loại" buttons to be DroppableFolder! (Without isSortable)
code = code.replace(
    /<button className=\{`btn btn-sm \$\{selectedFolderId === 'all' \? 'btn-primary' : 'btn-outline'\}`\} onClick=\{\(\) => setSelectedFolderId\('all'\)\} style=\{\{ whiteSpace: 'nowrap', flexShrink: 0 \}\}>Tất cả<\/button>/,
    `<DroppableFolder id="all" isSortable={false} isActive={selectedFolderId === 'all'} onClick={() => setSelectedFolderId('all')} name="Tất cả" />`
);

code = code.replace(
    /<button className=\{`btn btn-sm \$\{selectedFolderId === 'unassigned' \? 'btn-primary' : 'btn-outline'\}`\} onClick=\{\(\) => setSelectedFolderId\('unassigned'\)\} style=\{\{ whiteSpace: 'nowrap', flexShrink: 0 \}\}>Chưa phân loại<\/button>/,
    `<DroppableFolder id="unassigned" isSortable={false} isActive={selectedFolderId === 'unassigned'} onClick={() => setSelectedFolderId('unassigned')} name="Chưa phân loại" />`
);

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");