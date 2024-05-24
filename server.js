const express = require("express");
const app = express();
const port = 4000;
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });;


let broadcaster;
io.sockets.on("error", e => console.log(e));

io.sockets.on("connection", socket => {
    socket.on("broadcaster", () => {
        broadcaster = socket.id;
        socket.broadcast.emit("broadcaster");
        console.log("broadcasting "+ broadcaster);
    });

    socket.on("watcher", () => {
        socket.to(broadcaster).emit("watcher", socket.id);
        console.log("watching")
    });

    socket.on("offer", (id, message) => {
        socket.to(id).emit("offer", socket.id, message);
        console.log("offering")
    });

    socket.on("answer", (id, message) => {
        socket.to(id).emit("answer", socket.id, message);
        console.log("answering")
    });

    socket.on("candidate", (id, message) => {
        socket.to(id).emit("candidate", socket.id, message);
        console.log("candidating")
    });

    socket.on("disconnect", () => {
        socket.to(broadcaster).emit("disconnectPeer", socket.id);
        console.log("disconnected")
    });
});
server.listen(port, () => console.log(`Server is running on port ${port}`));
