const socket = io();

const errorBox = document.getElementById('errorBox');
const lobbyView = document.getElementById('lobbyView');
const joinView = document.getElementById('joinView');
const roomView = document.getElementById('roomView');
const usernameInput = document.getElementById('usernameInput');
const validBox = document.getElementById('validBox');
const validateUsernameBtn = document.getElementById('validateUsernameBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const goJoinViewBtn = document.getElementById('goJoinViewBtn');
const backLobbyBtn = document.getElementById('backLobbyBtn');
const roomsList = document.getElementById('roomsList');
const roomInfo = document.getElementById('roomInfo');
const playersList = document.getElementById('playersList');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');

let currentRoom = null;
let isUsernameValidated = false;

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function clearError() {
  errorBox.textContent = '';
  errorBox.style.display = 'none';
}

function getUsername() {
  return usernameInput.value.trim();
}

function setValidatedState(value) {
  isUsernameValidated = value;
  validBox.textContent = value ? `Pseudo valide: ${getUsername()}` : '';
}

function validateUsernameOrShowError() {
  const username = getUsername();
  if (!username) {
    setValidatedState(false);
    showError("Erreur : Vous devez ajouter un nom d'utilisateur.");
    return false;
  }

  if (username.length < 3) {
    setValidatedState(false);
    showError('Erreur : Minimum 3 caracteres pour le pseudo.');
    return false;
  }

  clearError();
  setValidatedState(true);
  return true;
}

function showView(view) {
  lobbyView.classList.add('hidden');
  joinView.classList.add('hidden');
  roomView.classList.add('hidden');
  view.classList.remove('hidden');
}

function renderLobby(rooms) {
  roomsList.innerHTML = '';

  if (!rooms.length) {
    const empty = document.createElement('li');
    empty.className = 'muted room-item';
    empty.textContent = 'Aucune room disponible pour le moment.';
    roomsList.appendChild(empty);
    return;
  }

  for (const room of rooms) {
    const item = document.createElement('li');
    item.className = 'room-item';

    const label = document.createElement('span');
    label.textContent = `${room.roomId} | Hote: ${room.ownerUsername} | ${room.playerCount} joueur(s)`;

    const joinBtn = document.createElement('button');
    joinBtn.type = 'button';
    joinBtn.textContent = 'Rejoindre';
    joinBtn.addEventListener('click', () => {
      if (!validateUsernameOrShowError()) {
        return;
      }

      clearError();
      socket.emit('join_room', { roomId: room.roomId, username: getUsername() });
    });

    item.appendChild(label);
    item.appendChild(joinBtn);
    roomsList.appendChild(item);
  }
}

function renderRoom(roomState) {
  currentRoom = roomState;
  showView(roomView);

  roomInfo.textContent = `Room de ${roomState.ownerUsername} (${roomState.roomId})`;
  playersList.innerHTML = '';

  for (const player of roomState.players) {
    const li = document.createElement('li');
    li.className = 'player-item';

    const label = document.createElement('span');
    label.textContent = player.id === roomState.ownerId ? `${player.username} (hote)` : player.username;

    li.appendChild(label);
    playersList.appendChild(li);
  }
}

validateUsernameBtn.addEventListener('click', () => {
  validateUsernameOrShowError();
});

usernameInput.addEventListener('input', () => {
  if (isUsernameValidated) {
    setValidatedState(false);
  }
});

createRoomBtn.addEventListener('click', () => {
  if (!validateUsernameOrShowError()) {
    return;
  }

  clearError();
  socket.emit('create_room', { username: getUsername() });
});

goJoinViewBtn.addEventListener('click', () => {
  if (!validateUsernameOrShowError()) {
    return;
  }

  clearError();
  socket.emit('get_rooms');
  showView(joinView);
});

backLobbyBtn.addEventListener('click', () => {
  clearError();
  showView(lobbyView);
});

leaveRoomBtn.addEventListener('click', () => {
  clearError();
  socket.emit('leave_room');
});

socket.on('connect', () => {
  clearError();
  socket.emit('get_rooms');
});

socket.on('disconnect', () => {
  showError('Connexion perdue avec le serveur.');
});

socket.on('error_message', (message) => {
  showError(message);
});

socket.on('rooms_list', (rooms) => {
  renderLobby(rooms);
});

socket.on('room_state', (roomState) => {
  const isInRoom = roomState.players.some((player) => player.id === socket.id);
  if (!isInRoom) {
    if (currentRoom && currentRoom.roomId === roomState.roomId) {
      showView(joinView);
    }
    return;
  }

  clearError();
  renderRoom(roomState);
});

socket.on('left_room', () => {
  showView(joinView);
  socket.emit('get_rooms');
});
