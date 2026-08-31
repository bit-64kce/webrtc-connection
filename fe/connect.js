class Webrtc {
  configuration = { 'iceServers': [{ 'urls': "stun:stun.l.google.com:19302" }] }
  peerConnection
  socket
  participants
  clickedparticipant
  recievedfrom
  constructor() {
    this.peerConnection = new RTCPeerConnection(this.configuration)
    this.socket = new WebSocket("ws://localhost:3000")
    this.socket.onopen = () => {

      console.log("Connected to the WebSocket server");
      this.socket.send("Hello Server");
      this.icetirckle()
      this.connection()

    };
    this.socket.onclose = (event) => {
      console.log(event.code)
    }
    this.socket.onmessage = async (event) => {
      let parsed;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        console.warn('Invalid JSON');
        return;
      }

      // The server wraps everything in 'content'
      const payload = parsed.content;   // <- this is the { offer, answer, new_ice_candidate, etc. }
      const from = parsed.from

      if (!payload) return;
      if (payload.userid) {
        let id = payload.userid
        localStorage.setItem('userid', id);
      }
      if (payload.offer) {
        this.recievedfrom = from
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(payload.offer)
        );
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.socket.send(JSON.stringify({
          to: parsed.from,          // echo back to the sender
          from: parsed.to,
          text: { answer }
        }));
      }

      if (payload.answer) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(payload.answer)
        );
      }

      if (payload.new_ice_candidate) {
        try {
          await this.peerConnection.addIceCandidate(payload.new_ice_candidate);
        } catch (error) {
          console.error('Error adding ICE candidate', error);
        }
      }
    };
  }
  async makeoffer(id) {
    console.log("making offer")
    const myid = localStorage.getItem('userid')
    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    //sendoffer using ws {offer:offer}
    this.socket.send(JSON.stringify({
      to: id,
      from: myid,
      text: { 'offer': offer }
    }))
    //
  }


  icetirckle() {
    this.peerConnection.addEventListener('icecandidate', event => {
      let data = this.clickedparticipant
      if (data == undefined) {
        data = this.recievedfrom
      }
      const myid = localStorage.getItem("userid")
      if (event.candidate) {
        this.socket.send(JSON.stringify({
          to: data,
          from: myid,
          text: { 'new_ice_candidate': event.candidate }
        }))
      }
    })
  }

  //get audiostream from browser
  async getaudiostream(configuration) {
    const audiotrack = await navigator.mediaDevices.getUserMedia(configuration)
    return audiotrack
  }

  //using audiostream so handlesending stream 
  async rtcrtpsend() {

    const configuration = {
      // 'video': true,
      'audio': true
    }

    const streams = await this.getaudiostream(configuration)
    const audiotracks = streams.getAudioTracks().forEach(tracks => {
      this.peerConnection.addTrack(tracks, streams)
    })

  }

  recievingstream() {
    let remoteAudio = document.getElementById('audio')
    this.peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams

      if (remoteStream) {
        //attach it to audio html element
        remoteAudio.srcObject = remoteStream
        remoteAudio.play()
      }
    }
  }
  connection() {
    this.peerConnection.addEventListener('connectionstatechange', () => {
      if (this.peerConnection.connectionState === 'connected') {
        console.log('connection')
      }
    }
    )
  }

  async getparticipants() {
    const response = await fetch('http://localhost:3000/participants', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    this.participants = data.data.data
    return this.participants
  }

  appendParticipants(callback) {
    const myid = localStorage.getItem('userid')
    const container = document.getElementById("button-container");
    for (let i = 0; i < this.participants.length; i++) {
      if (this.participants[i] !== myid) {
        const button = document.createElement("button");
        button.textContent = this.participants[i];

        button.addEventListener("click", () => {
          console.log("Clicked: " + this.participants[i]);
          this.clickedparticipant = this.participants[i]
          callback(this.participants[i])
        });
        container.appendChild(button);
      }
    }
  }
}

const webrtc = new Webrtc()
let click = document.getElementById('connect')
webrtc.rtcrtpsend()
webrtc.recievingstream()
setTimeout(async function () {
  await webrtc.getparticipants()
  webrtc.appendParticipants((id) => webrtc.makeoffer(id))
}, 5000)

//
// const id = localStorage.getItem('userid');
// click.addEventListener('click', () => {
//   webrtc.makeoffer(id)
// })
