import { dtx } from "./sdp"


class Webrtc {
  configuration = { 'iceServers': [{ 'urls': "stun:stun.l.google.com:19302" }] }
  peerConnection
  socket
  participants = []
  clickedparticipant
  recievedfrom
  constructor() {
    this.peerConnection = new RTCPeerConnection(this.configuration)
    this.socket = new WebSocket("ws://localhost:3000")
    this.socket.onopen = () => {
      let data = {
        userid: localStorage.getItem('userid')
      }
      this.socket.send(JSON.stringify(data));
      this.icetirckle()
      this.connection()


    };
    this.socket.onclose = (event) => {
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
      if (payload.offer) {
        this.recievedfrom = from
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(payload.offer)
        );
        const answer = await this.peerConnection.createAnswer();
        const modifiedSDP = dtx(answer)
        const myid = localStorage.getItem('userid')
        await this.peerConnection.setLocalDescription(modifiedSDP);
        this.socket.send(JSON.stringify({
          to: parsed.from,          // echo back to the sender
          from: myid,
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

      if (payload.userid) {
        let id = payload.userid;
        if (id) {
          if (id !== localStorage.getItem('userid')) {
            this.participants.push(id)
            this.appendParticipants((id) => this.makeoffer(id))
          }
        }
      }
    };
  }
  async makeoffer(id) {
    try {
      const myid = localStorage.getItem('userid')
      const offer = await this.peerConnection.createOffer()
      console.log(offer.sdp, typeof offer)
      // Add DTX while keeping everything else
      const modifiedSDP = dtx(offer.sdp)
      console.log(modifiedSDP)
      await this.peerConnection.setLocalDescription(modifiedSDP)
      //sendoffer using ws {offer:offer}
      this.socket.send(JSON.stringify({
        to: id,
        from: myid,
        text: { 'offer': offer }
      }))

    } catch (error) {
      console.log(error)
    }
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
    streams.getAudioTracks().forEach(tracks => {
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

        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 150;
        document.body.appendChild(canvas);
        const canvasCtx = canvas.getContext('2d');

        // Audio analyser setup
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(remoteStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);

        // Draw function that uses closures instead of parameters

        function draw() {
          requestAnimationFrame(draw);

          analyser.getByteTimeDomainData(dataArray);

          canvasCtx.fillStyle = "rgb(200 200 200)";
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeStyle = "rgb(0 0 0)";
          canvasCtx.beginPath();

          const sliceWidth = canvas.width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * canvas.height) / 2;
            if (i === 0) {
              canvasCtx.moveTo(x, y);
            } else {
              canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
          }

          canvasCtx.lineTo(canvas.width, canvas.height / 2);
          canvasCtx.stroke();
        }

        draw();
      }
    }
  }
  connection() {
    this.peerConnection.addEventListener('connectionstatechange', () => {
      if (this.peerConnection.connectionState === 'connected') {
      }
    }
    )
  }

  icecompleted() {
    this.peerConnection.addEventListener('icegatheringstatechange', () => {
      if (this.peerConnection.connectionState === 'failed') {
        this.peerConnection.setConfiguration(this.configuration)
        this.peerConnection.restartIce()
      }

      if (this.peerConnection.iceGatheringState === 'complete') {
        console.log('ICE gathering complete. Current Local Description:', this.peerConnection.currentLocalDescription);
        console.log('ICE gathering complete. Current Remote Description:', this.peerConnection.currentRemoteDescription);
      }
    })
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

    container.innerHTML = '';

    for (let i = 0; i < this.participants.length; i++) {
      if (this.participants[i] !== myid) {
        const button = document.createElement("button");
        button.textContent = this.participants[i];

        button.addEventListener("click", () => {
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
webrtc.icecompleted()
setTimeout(async function () {
  await webrtc.getparticipants()
  webrtc.appendParticipants((id) => webrtc.makeoffer(id))
}, 5000)

//
// const id = localStorage.getItem('userid');
// click.addEventListener('click', () => {
//   webrtc.makeoffer(id)
// })
