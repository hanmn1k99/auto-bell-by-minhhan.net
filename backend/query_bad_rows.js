const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db');

db.serialize(() => {
  db.all('SELECT * FROM "Period" WHERE "audioFileId" > 2147483647', (err, rows) => {
    if (err) console.error(err);
    console.log('Bad Periods:', rows);
  });
  db.all('SELECT * FROM "AudioFile" WHERE "id" > 2147483647', (err, rows) => {
    if (err) console.error(err);
    console.log('Bad AudioFiles:', rows);
  });
});

db.close();
