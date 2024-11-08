const express = require("express");
const app = express();
const port = 8000;
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server, { cors: { cors: {
    origin: "https://ultrashare.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
  } });


let rooms = {};

io.sockets.on("error", (e) => console.log(e));

io.sockets.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("createRoom", ({ roomId }) => {
    console.log(`Room created: ${roomId} by broadcaster ${socket.id}`);
    rooms[roomId] = { broadcaster: socket.id };
    socket.join(roomId);
  });

  socket.on("joinRoom", ({ roomId }) => {
    console.log(`Client ${socket.id} joining room: ${roomId}`);
    const room = rooms[roomId];

    if (room) {
      socket.join(roomId);
      // Notify broadcaster about new viewer
      io.to(room.broadcaster).emit("viewerJoined", {
        viewerId: socket.id,
        roomId,
      });
      console.log(`Notified broadcaster about new viewer in room: ${roomId}`);
    } else {
      console.log(`Room ${roomId} not found`);
      socket.emit("error", { message: "Room not found" });
    }
  });

  socket.on("offer", ({ offer, roomId, viewerId }) => {
    console.log(
      `Offer received from broadcaster for viewer ${viewerId} in room: ${roomId}`
    );
    io.to(viewerId).emit("offer", { offer, roomId });
  });

  socket.on("answer", ({ answer, roomId }) => {
    console.log(`Answer received from ${socket.id} in room: ${roomId}`);
    const room = rooms[roomId];
    if (room) {
      io.to(room.broadcaster).emit("answer", { answer, viewerId: socket.id });
    }
  });

  socket.on("iceCandidate", ({ candidate, roomId, to }) => {
    console.log(`ICE candidate received from ${socket.id} in room: ${roomId}`);
    if (to) {
      io.to(to).emit("iceCandidate", { candidate });
    } else {
      const room = rooms[roomId];
      if (room) {
        // If 'to' is not specified, send to broadcaster
        io.to(room.broadcaster).emit("iceCandidate", { candidate });
      }
    }
  });

  socket.on("leaveRoom", ({ roomId }) => {
    console.log(`Client ${socket.id} leaving room: ${roomId}`);
    socket.leave(roomId);

    const room = rooms[roomId];
    if (room && room.broadcaster === socket.id) {
      console.log(`Broadcaster left, closing room: ${roomId}`);
      delete rooms[roomId];
      io.to(roomId).emit("broadcasterLeft");
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    Object.values(rooms).forEach((value, key) => {
      if (value.broadcaster === socket.id) {
        console.log(`Broadcaster disconnected, closing room: ${key}`);
        delete rooms[key]
        io.to(key).emit("broadcasterLeft");
      }
    });
  });
});

app.get("/", (req, res) => {
  res.send("API WORKING");
});

server.listen(port, () => console.log(`Server is running on port ${port}`));
