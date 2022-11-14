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

const workspaces = new Map();

wsServer.on("connection", (socket, req) => {
  console.log("socket connected");
  socket.on("message", (msg) => {
    const parsedMsg = JSON.parse(msg);
    console.log(parsedMsg);
    console.log(wsServer.clients.size);

    // socket의 workspace id
    const workspaceId = parsedMsg.data;
    // workspaceId에 맞춰 workspaces에 socket 추가
    if (workspaces.get(workspaceId)) {
      workspaces.get(workspaceId).push(socket);
    } else {
      workspaces.set(workspaceId, [socket]);
    }

    // socket 연결 시, 해당 socket과 연결된 client socket이 위치한 workspace를 찾고,
    // workspace에 있는 멤버들에게 입장 사실을 socket message를 통해 알림
    for (let memSocket of workspaces.get(workspaceId)) {
      if (memSocket != socket) {
        memSocket.send(JSON.stringify({ event: "enter", data: "workspace01" }));
      }
    }
  });
});

httpServer.listen(3050, () => {
  console.log("Server listen on port " + httpServer.address().port);
});
