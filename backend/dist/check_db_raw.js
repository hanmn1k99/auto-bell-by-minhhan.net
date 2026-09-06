"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function run() {
    try {
        console.log("Checking Schedules...");
        const schedules = await prisma.$queryRawUnsafe('SELECT * FROM "Schedule"');
        console.dir(schedules, { depth: null });
        console.log("Checking Playlists...");
        const playlists = await prisma.$queryRawUnsafe('SELECT * FROM "Playlist"');
        console.dir(playlists, { depth: null });
        console.log("Checking PlaylistItems...");
        const playlistItems = await prisma.$queryRawUnsafe('SELECT * FROM "PlaylistItem"');
        console.dir(playlistItems, { depth: null });
        console.log("Checking AudioFiles...");
        const audioFiles = await prisma.$queryRawUnsafe('SELECT * FROM "AudioFile"');
        console.dir(audioFiles, { depth: null });
    }
    catch (err) {
        console.error("Error:", err);
    }
    finally {
        await prisma.$disconnect();
    }
}
run();
