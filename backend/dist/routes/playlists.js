"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/playlists
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const playlists = await prisma_1.prisma.playlist.findMany({
            include: {
                items: { include: { audioFile: true }, orderBy: { order: 'asc' } },
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(playlists);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to get playlists' });
    }
});
// GET /api/playlists/:id
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const playlist = await prisma_1.prisma.playlist.findUnique({
            where: { id: Number(req.params.id) },
            include: { items: { include: { audioFile: true }, orderBy: { order: 'asc' } } },
        });
        if (!playlist)
            return res.status(404).json({ error: 'Playlist not found' });
        res.json(playlist);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to get playlist' });
    }
});
// POST /api/playlists
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, description, volume } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Name is required' });
        const playlist = await prisma_1.prisma.playlist.create({
            data: {
                name,
                description,
                volume: typeof volume === 'number' ? volume : 1.0,
            },
        });
        res.status(201).json(playlist);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create playlist' });
    }
});
// PUT /api/playlists/:id
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, description, volume } = req.body;
        const playlist = await prisma_1.prisma.playlist.update({
            where: { id: Number(req.params.id) },
            data: {
                name,
                description,
                volume: typeof volume === 'number' ? volume : undefined,
            },
        });
        res.json(playlist);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update playlist' });
    }
});
// DELETE /api/playlists/:id
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        await prisma_1.prisma.playlist.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete playlist' });
    }
});
// POST /api/playlists/:id/items - add audio file to playlist
router.post('/:id/items', auth_1.authenticateToken, async (req, res) => {
    try {
        const { audioFileId } = req.body;
        const playlistId = Number(req.params.id);
        const count = await prisma_1.prisma.playlistItem.count({ where: { playlistId } });
        const item = await prisma_1.prisma.playlistItem.create({
            data: { playlistId, audioFileId: Number(audioFileId), order: count },
            include: { audioFile: true },
        });
        res.status(201).json(item);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to add item' });
    }
});
// PUT /api/playlists/:id/items/reorder - reorder playlist items
router.put('/:id/items/reorder', auth_1.authenticateToken, async (req, res) => {
    try {
        const { items } = req.body; // array of { id, order }
        await Promise.all(items.map((item) => prisma_1.prisma.playlistItem.update({ where: { id: item.id }, data: { order: item.order } })));
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to reorder' });
    }
});
// DELETE /api/playlists/:id/items/:itemId
router.delete('/:id/items/:itemId', auth_1.authenticateToken, async (req, res) => {
    try {
        await prisma_1.prisma.playlistItem.delete({ where: { id: Number(req.params.itemId) } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to remove item' });
    }
});
exports.default = router;
