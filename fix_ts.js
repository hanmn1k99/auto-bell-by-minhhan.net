const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// 1. Fix the import
code = code.replace(
    /import \{ DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent \} from '@dnd-kit\/core';/,
    "import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';\nimport type { DragEndEvent } from '@dnd-kit/core';"
);

// 2. Fix the typing on arrayMove
code = code.replace(
    /const newFolderFiles = arrayMove\(folderFiles, oldIndex, newIndex\);/,
    "const newFolderFiles = arrayMove(folderFiles, oldIndex, newIndex) as any[];"
);

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");