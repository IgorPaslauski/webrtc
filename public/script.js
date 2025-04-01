const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideosContainer = document.getElementById('remoteVideos');
const startCallBtn = document.getElementById('startCall');
const toggleVideoBtn = document.getElementById('toggleVideo');
const toggleAudioBtn = document.getElementById('toggleAudio');
const switchCameraBtn = document.getElementById('switchCamera');
const fullscreenBtn = document.getElementById('fullscreen');
const disconnectBtn = document.getElementById('disconnect');
const usernameInput = document.getElementById('username');
const setUsernameBtn = document.getElementById('setUsername');
const logPanel = document.getElementById('logPanel');
const localVideoIndicator = document.getElementById('localVideoIndicator');
const localAudioIndicator = document.getElementById('localAudioIndicator');
let localStream;
let mySocketId;
let username = 'Você';
const peerConnections = {};
const remoteStreams = {};
let videoEnabled = true;
let audioEnabled = true;
let currentCameraIndex = 0;
let videoDevices = [];

const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' }
    ]
};

function log(message) {
    console.log(message);
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logPanel.appendChild(logEntry);
    logPanel.scrollTop = logPanel.scrollHeight;
}

function updateLocalIndicators() {
    localVideoIndicator.classList.toggle('active', videoEnabled);
    localVideoIndicator.classList.toggle('muted', !videoEnabled);
    localAudioIndicator.classList.toggle('active', audioEnabled);
    localAudioIndicator.classList.toggle('muted', !audioEnabled);
}

async function getMedia() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter(device => device.kind === 'videoinput');
        log(`Dispositivos de vídeo: ${videoDevices.length}`);

        const constraints = {
            video: videoDevices.length > 0 ? { deviceId: videoDevices[currentCameraIndex].deviceId } : true,
            audio: true
        };
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideo.srcObject = localStream;
        log('Mídia local obtida: ' + localStream.getTracks().map(t => t.kind).join(', '));
        updateUsername();
        updateLocalIndicators();
    } catch (error) {
        log('Erro ao acessar mídia: ' + error.message);
    }
}

async function switchCamera() {
    if (videoDevices.length < 2) {
        log('Apenas uma câmera disponível');
        return;
    }
    currentCameraIndex = (currentCameraIndex + 1) % videoDevices.length;
    log(`Trocando para câmera: ${videoDevices[currentCameraIndex].label}`);

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    const constraints = {
        video: { deviceId: videoDevices[currentCameraIndex].deviceId },
        audio: true
    };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    localVideo.srcObject = localStream;

    for (const remoteId in peerConnections) {
        const pc = peerConnections[remoteId];
        const senders = pc.getSenders();
        localStream.getVideoTracks().forEach(track => {
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
                videoSender.replaceTrack(track);
                log(`Track de vídeo atualizado para ${remoteId}`);
            }
        });
    }
    updateLocalIndicators();
}

function toggleTrack(kind, button, enabledVar) {
    if (!localStream) return;
    const track = localStream.getTracks().find(t => t.kind === kind);
    if (track) {
        track.enabled = !track.enabled;
        window[enabledVar] = track.enabled;
        button.innerHTML = `<i class="fas fa-${kind === 'video' ? 'video' : 'microphone'}${track.enabled ? '' : '-slash'}"></i> ${kind === 'video' ? 'Vídeo' : 'Áudio'}`;
        log(`${kind} ${track.enabled ? 'ativado' : 'desativado'}`);
        updateLocalIndicators();
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        localVideo.requestFullscreen().catch(err => log('Erro ao entrar em tela cheia: ' + err.message));
    } else {
        document.exitFullscreen();
    }
}

function setUsername() {
    username = usernameInput.value.trim() || 'Você';
    updateUsername();
    socket.emit('set-username', { username, id: mySocketId });
    log(`Nome definido como: ${username}`);
}

function updateUsername() {
    document.getElementById('localLabel').textContent = username;
}

async function startCall() {
    if (!localStream) {
        log('Local stream não disponível');
        alert('Aguarde a câmera ser inicializada.');
        return;
    }
    const remoteIds = Object.keys(peerConnections);
    if (remoteIds.length === 0) {
        alert('Aguarde outros usuários se conectarem.');
        return;
    }

    for (const remoteId of remoteIds) {
        if (!peerConnections[remoteId].localDescription) {
            const pc = peerConnections[remoteId];
            log('Criando offer para: ' + remoteId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            log('Offer enviado para: ' + remoteId);
            socket.emit('offer', { offer, target: remoteId });
        }
    }
}

function disconnect() {
    for (const remoteId in peerConnections) {
        peerConnections[remoteId].close();
        delete peerConnections[remoteId];
    }
    for (const remoteId in remoteStreams) {
        remoteStreams[remoteId].parentElement.remove();
        delete remoteStreams[remoteId];
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    socket.disconnect();
    startCallBtn.disabled = true;
    log('Desconectado manualmente');
}

function createPeerConnection(remoteId) {
    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            log('ICE candidate gerado para: ' + remoteId);
            socket.emit('candidate', { candidate: event.candidate, target: remoteId });
        }
    };

    pc.ontrack = (event) => {
        log('Evento ontrack disparado para: ' + remoteId);
        if (!remoteStreams[remoteId]) {
            const wrapper = document.createElement('div');
            wrapper.className = 'video-wrapper';
            const video = document.createElement('video');
            video.id = `remote-${remoteId}`;
            video.autoplay = true;
            video.playsinline = true;
            const header = document.createElement('div');
            header.className = 'video-header';
            const label = document.createElement('span');
            label.className = 'video-label';
            label.id = `label-${remoteId}`;
            label.textContent = 'Anônimo';
            const indicators = document.createElement('div');
            indicators.className = 'video-indicators';
            const videoIndicator = document.createElement('i');
            videoIndicator.className = 'fas fa-video indicator';
            videoIndicator.id = `videoIndicator-${remoteId}`;
            const audioIndicator = document.createElement('i');
            audioIndicator.className = 'fas fa-microphone indicator';
            audioIndicator.id = `audioIndicator-${remoteId}`;
            indicators.appendChild(videoIndicator);
            indicators.appendChild(audioIndicator);
            header.appendChild(label);
            header.appendChild(indicators);
            const status = document.createElement('div');
            status.className = 'ice-status';
            status.id = `status-${remoteId}`;
            wrapper.appendChild(header);
            wrapper.appendChild(video);
            wrapper.appendChild(status);
            remoteVideosContainer.appendChild(wrapper);
            remoteStreams[remoteId] = video;
            log('Vídeo remoto criado para: ' + remoteId);
        }
        if (remoteStreams[remoteId].srcObject !== event.streams[0]) {
            remoteStreams[remoteId].srcObject = event.streams[0];
            log('Stream remoto vinculado a: ' + remoteId);
            const videoTrack = event.streams[0].getVideoTracks()[0];
            const audioTrack = event.streams[0].getAudioTracks()[0];
            const videoIndicator = document.getElementById(`videoIndicator-${remoteId}`);
            const audioIndicator = document.getElementById(`audioIndicator-${remoteId}`);
            if (videoTrack) {
                videoIndicator.classList.toggle('active', videoTrack.enabled);
                videoIndicator.classList.toggle('muted', !videoTrack.enabled);
            }
            if (audioTrack) {
                audioIndicator.classList.toggle('active', audioTrack.enabled);
                audioIndicator.classList.toggle('muted', !audioTrack.enabled);
            }
        }
    };

    pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        log('ICE state para ' + remoteId + ': ' + state);
        const status = document.getElementById(`status-${remoteId}`);
        if (status) {
            status.textContent = state;
            status.className = `ice-status ${state}`;
        }
    };

    if (localStream) {
        localStream.getTracks().forEach(track => {
            log('Adicionando track ' + track.kind + ' ao peerConnection de ' + remoteId);
            pc.addTrack(track, localStream);
        });
    }

    peerConnections[remoteId] = pc;
    return pc;
}

socket.on('user-connected', async (data) => {
    log('Usuários na sala: ' + data.users.join(', '));
    mySocketId = socket.id;
    const otherUsers = data.users.filter(id => id !== mySocketId);

    if (!localStream) {
        log('Aguardando mídia local');
        await getMedia();
    }

    otherUsers.forEach(remoteId => {
        if (!peerConnections[remoteId]) {
            log('Criando conexão para: ' + remoteId);
            createPeerConnection(remoteId);
        }
    });

    if (otherUsers.length > 0) {
        startCallBtn.disabled = false;
    }
});

socket.on('user-disconnected', (disconnectedId) => {
    log('Usuário desconectado: ' + disconnectedId);
    if (peerConnections[disconnectedId]) {
        peerConnections[disconnectedId].close();
        delete peerConnections[disconnectedId];
    }
    if (remoteStreams[disconnectedId]) {
        remoteStreams[disconnectedId].parentElement.remove();
        delete remoteStreams[disconnectedId];
    }
    if (Object.keys(peerConnections).length === 0) {
        startCallBtn.disabled = true;
    }
});

socket.on('offer', async (data) => {
    log('Offer recebido de: ' + data.sender);
    const remoteId = data.sender;

    if (!peerConnections[remoteId]) {
        createPeerConnection(remoteId);
    }

    const pc = peerConnections[remoteId];
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    log('Answer enviado para: ' + remoteId);
    socket.emit('answer', { answer, target: remoteId });
});

socket.on('answer', async (data) => {
    log('Answer recebido de: ' + data.sender);
    const pc = peerConnections[data.sender];
    if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
});

socket.on('candidate', async (data) => {
    log('ICE candidate recebido de: ' + data.sender);
    const pc = peerConnections[data.sender];
    if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});

socket.on('username-update', (data) => {
    const label = document.getElementById(`label-${data.id}`);
    if (label) {
        label.textContent = data.username || 'Anônimo';
        log(`Nome atualizado para ${data.id}: ${data.username}`);
    }
});

getMedia();
startCallBtn.addEventListener('click', startCall);
toggleVideoBtn.addEventListener('click', () => toggleTrack('video', toggleVideoBtn, 'videoEnabled'));
toggleAudioBtn.addEventListener('click', () => toggleTrack('audio', toggleAudioBtn, 'audioEnabled'));
switchCameraBtn.addEventListener('click', switchCamera);
fullscreenBtn.addEventListener('click', toggleFullscreen);
disconnectBtn.addEventListener('click', disconnect);
setUsernameBtn.addEventListener('click', setUsername);
usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') setUsername(); });