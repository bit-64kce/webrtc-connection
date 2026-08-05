class Webrtc {
  configuration = { 'iceServers': [{ 'urls': "stun:stun.l.google.com:19302" }] }
  peerConnetction = new RTCPeerConnection(this.configuration)
  socket = new WebSocket("ws://localhost:3000")
  constructor() {
    this.socket.addEventListener("open", (event) => {
      this.socket.send("Hello server i just connected")
    })
    this.socket.addEventListener('message', async data => {
      if (data.answer) {
        const remotdesc = new RTCSessionDescription(data.answer)
        await this.peerConnetction.setRemoteDescription(remotdesc)
      }
    })

    this.icetirckle()
    this.icetrickle_recieve()
    this.connection()
  }
  async makeoffer() {
    const offer = await this.peerConnetction.createOffer()
    await this.peerConnetction.setLocalDescription(offer)
    //sendoffer using ws {offer:offer}
    this.socket.send({
      to: 'targetuserid',
      from: 'currentuserid',
      text: { 'offer': offer }
    })
    //
  }

  async recieveoffer() {
    this.socket.on('message', async data => {
      if (data.offer) {
        this.peerConnetction.setRemoteDescription(new RTCSessionDescription(data.offer))
        const answer = await this.peerConnetction.createAnswer()
        await this.peerConnetction.setLocalDescription(answer)
        this.socket.send({
          to: 'targetuserid',
          from: 'currentuserid',
          text: { 'answer': answer }
        })
      }
    })
  }
  icetirckle() {
    this.peerConnetction.addEventListener('icecandidate', event => {

      if (event.candidate) {
        this.socket.send({
          to: 'targetuserid',
          from: 'currentuserid',
          text: { 'new_ice_candidate': event.candidate }
        })
      }
    })
  }
  icetrickle_recieve() {
    this.socket.addEventListener('message', async data => {
      if (data.new_ice_candidate) {
        try {
          await this.peerConnetction.addIceCandidate(data.new_ice_candidate)
        } catch (error) {
          console.error('Error adding recieved ice candidate')
        }
      }
    })
  }



  //get audiostream from browser
  getaudiostream(configuration) {

  }

  //using audiostream so handlesending stream 
  rtcrtpsend() {
    this.peerConnetction
  }
  connection() {
    this.peerConnetction.addEventListener('connection', () => {
      if (this.peerConnetction.connectionState === 'connected') {
        console.log('connection')
      }
    }
    )
  }
}
export default Webrtc
