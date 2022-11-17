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
    // console.log(workspaces);

    switch (parsedMsg.event) {
      // socket 연결 (workspace 입장 시)
      case "enter":
        socket["id"] = parsedMsg.from;
        console.log(socket["id"]);
        // socket의 workspace id
        const workspaceId = parsedMsg.data;
        // workspaceId에 맞춰 workspaces에 socket 추가
        if (workspaces.get(workspaceId)) {
          workspaces.get(workspaceId).push(socket);
        } else {
          workspaces.set(workspaceId, [socket]);
        }
        sockets.set(socket, workspaceId);

        const memList = [];
        // socket 연결 시, 해당 socket과 연결된 client socket이 위치한 workspace를 찾고,
        for (let memSocket of workspaces.get(workspaceId)) {
          // workspace에 있는 멤버들에게 입장 사실을 socket message를 통해 알림
          if (memSocket !== socket) {
            memList.push(memSocket["id"]);
            memSocket.send(
              JSON.stringify({
                event: "memberEnter",
                data: workspaceId,
                from: socket["id"],
              })
            );
          }
        }
        // 입장 시 본인 외 다른 사람이 있으면 다른 멤버들의 id 리스트를 보냄
        if (memList.length != 0) {
          socket.send(JSON.stringify({ event: "memList", data: memList }));
        }
        break;
      // client에서 offer 생성 후 서버에서 offer msg 받을 시
      case "offer":
        // 해당 workspace에 있는 다른 멤버들에게 offer 보내기
        const offerWS = sockets.get(socket);
        for (let memSocket of workspaces.get(offerWS)) {
          if (memSocket["id"] === parsedMsg.to) {
            memSocket.send(
              JSON.stringify({
                event: "offer",
                data: parsedMsg.data,
                from: socket["id"],
                to: memSocket["id"],
              })
            );
          }
        }
        break;
      case "answer":
        // 해당 workspace에 있는 다른 멤버들에게 answer 보내기
        const answerWS = sockets.get(socket);
        for (let memSocket of workspaces.get(answerWS)) {
          if (memSocket["id"] === parsedMsg.to) {
            memSocket.send(
              JSON.stringify({
                event: "answer",
                data: parsedMsg.data,
                from: socket["id"],
                to: memSocket["id"],
              })
            );
          }
        }
        break;
      case "ice":
        // 해당 workspace에 있는 다른 멤버들에게 ice 보내기
        // TODO: 3번째 멤버 입장부터, 이미 answer를 받아서 remoteOffer를 설정한 socket에도 answer를 다시 보내고 있음. 추후 재전송하지 않도록 수정 필요
        const iceWS = sockets.get(socket);
        for (let memSocket of workspaces.get(iceWS)) {
          if (memSocket["id"] === parsedMsg.to) {
            memSocket.send(
              JSON.stringify({
                event: "ice",
                data: parsedMsg.data,
                from: socket["id"],
                to: memSocket["id"],
              })
            );
          }
        }
        break;
      case "exitPage":
        console.log("Exit!!!!");
        const exitPageWS = sockets.get(socket);
        for (let memSocket of workspaces.get(exitPageWS)) {
          if (memSocket !== socket) {
            memSocket.send(
              JSON.stringify({
                event: "memberExit",
                data: "exit",
                from: socket["id"],
                to: memSocket["id"],
              })
            );
          }
        }
        workspaces
          .get(exitPageWS)
          .splice(workspaces.get(exitPageWS).indexOf(socket), 1);
        sockets.delete(socket);
        break;
    }
  });
  // socket.on("close", () => {
  //   const exitPageWS = sockets.get(socket);
  //   for (let memSocket of workspaces.get(exitPageWS)) {
  //     if (memSocket !== socket) {
  //       memSocket.send(
  //         JSON.stringify({
  //           event: "memberExit",
  //           data: "exit",
  //           from: socket["id"],
  //           to: memSocket["id"],
  //         })
  //       );
  //     }
  //   }
  // });
});

httpServer.listen(3050, () => {
  console.log("Server listen on port " + httpServer.address().port);
});
