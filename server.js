const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const MAX_MEMBERS = 8;

// Demo storage: rooms/messages live in memory and reset when the server restarts.
const rooms = new Map();

app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true }));

function clean(value, max = 40) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, max);
}
function roomView(room) {
  return {
    id: room.id,
    name: room.name,
    members: [...room.members.values()].map(m => ({ id: m.id, name: m.name })),
    count: room.members.size,
    maxMembers: MAX_MEMBERS,
    groups: [...room.groups.values()].map(g => ({
      id: g.id, name: g.name,
      members: [...g.members].map(id => room.members.get(id)).filter(Boolean).map(m => ({ id: m.id, name: m.name }))
    }))
  };
}
function emitRoom(room) {
  io.to(room.id).emit("room:update", roomView(room));
}
function leaveCurrent(socket) {
  const oldId = socket.data.roomId;
  if (!oldId) return;
  const room = rooms.get(oldId);
  if (room) {
    room.members.delete(socket.id);
    for (const group of room.groups.values()) group.members.delete(socket.id);
    socket.leave(oldId);
    emitRoom(room);
    if (room.members.size === 0) rooms.delete(oldId);
  }
  socket.data.roomId = null;
}

io.on("connection", socket => {
  socket.on("room:create", ({ name, username, password }, cb = () => {}) => {
    const roomName = clean(name, 48);
    const user = clean(username, 24);
    const pass = String(password || "");
    if (!roomName || !user || pass.length < 4) return cb({ ok: false, error: "Shyiramo izina, username na password nibura inyuguti 4." });
    leaveCurrent(socket);
    const id = crypto.randomBytes(4).toString("hex").toUpperCase();
    const room = { id, name: roomName, password: pass, members: new Map(), groups: new Map(), messages: [] };
    rooms.set(id, room);
    room.members.set(socket.id, { id: socket.id, name: user });
    socket.data.roomId = id;
    socket.join(id);
    cb({ ok: true, roomId: id, room: roomView(room), messages: room.messages });
    emitRoom(room);
  });

  socket.on("room:join", ({ roomId, username, password }, cb = () => {}) => {
    const id = clean(roomId, 12).toUpperCase();
    const user = clean(username, 24);
    const room = rooms.get(id);
    if (!room) return cb({ ok: false, error: "Icyo cyumba ntikibaho cyangwa cyarafunzwe." });
    if (!user) return cb({ ok: false, error: "Andika username yawe." });
    if (room.password !== String(password || "")) return cb({ ok: false, error: "Password si yo." });
    if (room.members.size >= MAX_MEMBERS && !room.members.has(socket.id))
      return cb({ ok: false, error: "Iki cyumba cyuzuye. Abantu 8 ni bo ntarengwa." });
    leaveCurrent(socket);
    room.members.set(socket.id, { id: socket.id, name: user });
    socket.data.roomId = id;
    socket.join(id);
    cb({ ok: true, roomId: id, room: roomView(room), messages: room.messages });
    emitRoom(room);
    io.to(id).emit("system:message", { text: `${user} yinjiye mu cyumba.`, at: new Date().toISOString() });
  });

  socket.on("chat:send", ({ text }, cb = () => {}) => {
    const room = rooms.get(socket.data.roomId);
    const member = room?.members.get(socket.id);
    const message = clean(text, 1000);
    if (!room || !member || !message) return cb({ ok: false });
    const item = { id: crypto.randomUUID(), userId: socket.id, username: member.name, text: message, at: new Date().toISOString() };
    room.messages.push(item);
    if (room.messages.length > 200) room.messages.shift();
    io.to(room.id).emit("chat:message", item);
    cb({ ok: true });
  });

  socket.on("group:create", ({ name }, cb = () => {}) => {
    const room = rooms.get(socket.data.roomId);
    if (!room || !room.members.has(socket.id)) return cb({ ok: false, error: "Banza winjire mu cyumba." });
    const groupName = clean(name, 36);
    if (!groupName) return cb({ ok: false, error: "Andika izina ry'umurwi." });
    const id = crypto.randomBytes(3).toString("hex");
    room.groups.set(id, { id, name: groupName, members: new Set([socket.id]), messages: [] });
    emitRoom(room);
    cb({ ok: true, groupId: id });
  });

  socket.on("group:join", ({ groupId }, cb = () => {}) => {
    const room = rooms.get(socket.data.roomId);
    const group = room?.groups.get(groupId);
    if (!group || !room.members.has(socket.id)) return cb({ ok: false, error: "Umurwi ntubashije kuboneka." });
    group.members.add(socket.id);
    emitRoom(room);
    cb({ ok: true });
  });

  socket.on("group:send", ({ groupId, text }, cb = () => {}) => {
    const room = rooms.get(socket.data.roomId);
    const group = room?.groups.get(groupId);
    const member = room?.members.get(socket.id);
    const message = clean(text, 1000);
    if (!group || !member || !group.members.has(socket.id) || !message) return cb({ ok: false });
    const item = { id: crypto.randomUUID(), userId: socket.id, username: member.name, text: message, at: new Date().toISOString() };
    group.messages.push(item);
    io.to(room.id).emit("group:message", { groupId, message: item });
    cb({ ok: true });
  });

  socket.on("typing", () => {
    const room = rooms.get(socket.data.roomId);
    const member = room?.members.get(socket.id);
    if (room && member) socket.to(room.id).emit("typing", { username: member.name });
  });

  socket.on("room:leave", () => leaveCurrent(socket));
  socket.on("disconnect", () => leaveCurrent(socket));
});

server.listen(PORT, () => console.log(`Private Chat 8 running at http://localhost:${PORT}`));