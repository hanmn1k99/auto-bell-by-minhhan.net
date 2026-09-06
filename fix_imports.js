const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

const imports = "import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';\nimport { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';\nimport { SortableFile } from './SortableFile';\nimport axios from 'axios';\n";

if (!code.includes('@dnd-kit/core')) {
    code = code.replace(
        "import React",
        imports + "import React"
    );
    fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
    console.log("Done");
} else {
    console.log("Already has imports");
}