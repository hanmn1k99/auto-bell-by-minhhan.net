const fs = require('fs');

function fixDaysOfWeek(filePath) {
  let c = fs.readFileSync(filePath, 'utf8');
  
  // Replace `daysOfWeek,` with `daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek.join(',') : String(daysOfWeek),`
  // But be careful not to replace it in destructuring or if statements.
  // We only replace it when it's inside `data: { ... }`.
  
  // Actually, we can just replace the definition or the usage.
  // A safer way is to redefine daysOfWeek right after destructuring:
  c = c.replace(/const \{ (.*?)daysOfWeek(.*?) \} = req\.body;/g, 'const { $1daysOfWeek: rawDaysOfWeek$2 } = req.body;\n    const daysOfWeek = Array.isArray(rawDaysOfWeek) ? rawDaysOfWeek.join(",") : (rawDaysOfWeek ? String(rawDaysOfWeek) : undefined);');
  
  // For periods bulk
  c = c.replace(/daysOfWeek: p\.daysOfWeek,/g, 'daysOfWeek: Array.isArray(p.daysOfWeek) ? p.daysOfWeek.join(",") : String(p.daysOfWeek),');
  
  // For periods bulk-update
  c = c.replace(/dataToUpdate\.daysOfWeek = daysOfWeek;/g, 'dataToUpdate.daysOfWeek = Array.isArray(daysOfWeek) ? daysOfWeek.join(",") : String(daysOfWeek);');
  
  fs.writeFileSync(filePath, c);
}

fixDaysOfWeek('backend/src/routes/periods.ts');
fixDaysOfWeek('backend/src/routes/schedules.ts');
