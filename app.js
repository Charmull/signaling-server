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
const sockets = new Map();

wsServer.on("connection", (socket, req) => {
  console.log("socket connected");
  socket.on("message", (msg) => {
    const parsedMsg = JSON.parse(msg);
    console.log(wsServer.clients.size);
    console.log(workspaces);

    switch (parsedMsg.event) {
      // socket 연결 (workspace 입장 시)
      case "enter":
        // socket의 workspace id
        const workspaceId = parsedMsg.data;
        // workspaceId에 맞춰 workspaces에 socket 추가
        if (workspaces.get(workspaceId)) {
          workspaces.get(workspaceId).push(socket);
        } else {
          workspaces.set(workspaceId, [socket]);
        }
        sockets.set(socket, workspaceId);

        // socket 연결 시, 해당 socket과 연결된 client socket이 위치한 workspace를 찾고,
        // workspace에 있는 멤버들에게 입장 사실을 socket message를 통해 알림
        for (let memSocket of workspaces.get(workspaceId)) {
          if (memSocket != socket) {
            memSocket.send(
              JSON.stringify({ event: "enter", data: "workspace01" })
            );
          }
        }
        break;
      // client에서 offer 생성 후 서버에서 offer msg 받을 시
      case "offer":
        // 해당 workspace에 있는 다른 멤버들에게 offer 보내기
        // TODO: 3번째 멤버 입장부터, 이미 offer를 받아서 remoteOffer를 설정한 socket에도 offer를 다시 보내고 있음. 추후 재전송하지 않도록 수정 필요
        const workspace = sockets.get(socket);
        for (let memSocket of workspaces.get(workspace)) {
          if (memSocket != socket) {
            memSocket.send(
              JSON.stringify({ event: "offer", data: parsedMsg.data })
            );
          }
        }
        break;
      case "answer":
        // 해당 workspace에 있는 다른 멤버들에게 answer 보내기
        // TODO: 3번째 멤버 입장부터, 이미 answer를 받아서 remoteOffer를 설정한 socket에도 answer를 다시 보내고 있음. 추후 재전송하지 않도록 수정 필요
        const answerWs = sockets.get(socket);
        for (let memSocket of workspaces.get(answerWs)) {
          if (memSocket != socket) {
            memSocket.send(
              JSON.stringify({ event: "answer", data: parsedMsg.data })
            );
          }
        }
        break;
      case "ice":
        // 해당 workspace에 있는 다른 멤버들에게 ice 보내기
        // TODO: 3번째 멤버 입장부터, 이미 answer를 받아서 remoteOffer를 설정한 socket에도 answer를 다시 보내고 있음. 추후 재전송하지 않도록 수정 필요
        const iceWs = sockets.get(socket);
        for (let memSocket of workspaces.get(iceWs)) {
          if (memSocket != socket) {
            memSocket.send(
              JSON.stringify({ event: "ice", data: parsedMsg.data })
            );
          }
        }
        break;
    }
  });
});

httpServer.listen(3050, () => {
  console.log("Server listen on port " + httpServer.address().port);
});
