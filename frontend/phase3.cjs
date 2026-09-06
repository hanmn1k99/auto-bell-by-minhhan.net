const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

const startIndex = code.indexOf('{folders.map(folder => (');
const endIndex = code.indexOf('))}\n              <button className="btn btn-sm btn-outline"');

if (startIndex !== -1 && endIndex !== -1) {
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
    code = code.substring(0, startIndex) + newFolderMap + code.substring(endIndex + 3);
    fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
    console.log("Done");
} else {
    console.log("Not found", startIndex, endIndex);
    // Fallback: search for '))} \r\n'
    const endIndex2 = code.indexOf('))}\r\n              <button className="btn btn-sm btn-outline"');
    if (startIndex !== -1 && endIndex2 !== -1) {
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
        code = code.substring(0, startIndex) + newFolderMap + code.substring(endIndex2 + 3);
        fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
        console.log("Done2");
    }
}