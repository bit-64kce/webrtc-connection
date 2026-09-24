import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
const port = 3000;

type usrdata = {
  userid: string
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = req.url || '/';

  const setCorsHeaders = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  };
  // Helper to send JSON easily
  const sendJson = (status: number, body: any) => {
    setCorsHeaders();
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  //Manageoptions
  if (req.method === 'OPTIONS') {
    setCorsHeaders();
    res.writeHead(204);
    res.end();
    return;
  }

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

  if (req.method === 'GET' && url === "/participants") {
    console.log('receiving get request for participants')
    const participantIds = Array.from(usersockets.keys());
    const responsePayload = {
      status: 'success',
      data: {
        message: "connected users",
        data: participantIds
      },
      timestamp: new Date().toISOString(),
    };
    sendJson(200, responsePayload);
    return;
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
    return;
  }

  // Route: / (Home)
  if (url === '/') {
    setCorsHeaders();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World! Server is running.');
    return;
  } else {
    // 404 for everything else
    setCorsHeaders();
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const wss = new WebSocketServer({ server })

// const room: Map<string, Set<WebSocket>> = new Map();
const usersockets: Map<string, WebSocket> = new Map();


wss.on('connection', (ws) => {
  let data: usrdata;
  ws.once('message', async (dt: string) => {
    try {
      data = JSON.parse(dt.toString())
      if (data.userid) {
        if (!usersockets.get(data.userid)) {
          usersockets.set(data.userid, ws)

          //send userinfo for others
          const dtbody = JSON.stringify({
            type: 'direct-message',
            content: { 'userid': data.userid }
          })
          usersockets.forEach((socket, userId) => {
            if (userId !== data.userid) {
              socket.send(dtbody);
            }
          });
        } else {
          throw new Error("useralready exist")
        }
      } else {
        throw new Error("user not found")
      }

    } catch (error: any) {
      throw error
    }
  })

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
      throw new Error("invalid json structure")
    }
  })
  //cleanup
  ws.on('close', () => {
    usersockets.delete(data.userid)
    console.log(`User ${data.userid} is disconnected`)
  })
})



server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
