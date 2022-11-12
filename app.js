import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import express from "express";

var app = express();
var httpServer = http.createServer(app);
const wsServer = new WebSocketServer({ server: httpServer });

app.get("/", (req, res) => {
  res.send("root page");
});

app.get("/*", function (req, res) {
  res.redirect("/");
});

wsServer.on("connection", (socket) => {
  console.log("socket connected");
  socket.on("message", (msg) => {
    const parsedMsg = JSON.parse(msg);
    console.log(parsedMsg);
  });
});

httpServer.listen(3050, () => {
  console.log("Server listen on port " + httpServer.address().port);
});
