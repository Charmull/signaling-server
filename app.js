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

    let workspace;
    switch (parsedMsg.event) {
      // socket 연결 (workspace 입장 시)
      case "enter":
        socket["id"] = parsedMsg.from;
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
        // 해당 workspace에 있는 타겟 멤버(새로 입장한 멤버)에게 offer 보내기
        // const offerWS = sockets.get(socket);
        workspace = sockets.get(socket);
        for (let memSocket of workspaces.get(workspace)) {
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
        // 해당 workspace에 있는 타겟 멤버(answer 받을 멤버)에게 answer 보내기
        // const answerWS = sockets.get(socket);
        workspace = sockets.get(socket);
        for (let memSocket of workspaces.get(workspace)) {
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
        // 해당 workspace에 있는 타겟 멤버(ice 받을 멤버)에게 ice 보내기
        // const iceWS = sockets.get(socket);
        workspace = sockets.get(socket);
        for (let memSocket of workspaces.get(workspace)) {
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
      // 페이지를 나간 멤버가 'exitPage' 메세지를 보냄
      case "exitPage":
        // 페이지를 나간 멤버가 있던 workspace를 찾고, 그 안에 있는 멤버들에게 누가 나갔는지 알림
        console.log("Exit!!!!");
        // const exitPageWS = sockets.get(socket);
        workspace = sockets.get(socket);
        for (let memSocket of workspaces.get(workspace)) {
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
          .get(workspace)
          .splice(workspaces.get(workspace).indexOf(socket), 1);
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
