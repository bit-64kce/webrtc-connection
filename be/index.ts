import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
const port = 3000;

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = req.url || '/';

  // Helper to send JSON easily
  const sendJson = (status: number, body: any) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  // Route: /webrtc
  if (req.method === 'GET' && url === '/webrtc') {
    console.log('Received GET /webrtc');

    const responsePayload = {
      status: 'active',
      message: 'WebRTC signaling server is ready',
      timestamp: new Date().toISOString(),
      sessionId: Math.random().toString(36).substring(7)
    };

    sendJson(200, responsePayload);
    return; // Stop execution here so we don't fall through to other logic
  }

  if (req.method === 'POST' && url === "/webrtc") {
    let body = '';
    req.on("data", (data) => {
      body = body + data
    })

    req.on("end", () => {
      try {
        const parseddata = JSON.parse(body)
        console.log('request body', parseddata)
        sendJson(200, {
          message: "success"
        })
      } catch (error: any) {
        throw new Error(error.message)
      }
    })
  }

  // Route: / (Home)
  if (url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World! Server is running.');
    return;
  }

  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

const wss = new WebSocketServer({ server })

const room: Map<string, Set<WebSocket>> = new Map();
const usersockets: Map<string, WebSocket> = new Map();


wss.on("connection", (ws) => {
  const userid = uuidv4();
  (ws as any).userId = userid;
  (ws as any).currentRoom = null;

  usersockets.set(userid, ws)

  ws.on('message', (data, isbinary,) => {
    isbinary = false;
    try {
      const message = JSON.parse(data.toString());
      console.log(message)
      //send message to specific user 
      if (message.to) {
        const check = usersockets.get(message.to)
        if (check) {
          check.send(JSON.stringify({
            type: 'direct-message',
            from: message.from,
            content: message.text
          }))
        }
      }
    } catch (err) {

    }
  })
  //cleanup
  ws.on('close', () => {
    usersockets.delete(userid)
    console.log(`User ${userid} is disconnected`)
  })
})



server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});


