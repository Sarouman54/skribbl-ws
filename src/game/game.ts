import { socket } from "../utils/socket.ts";
import type { PublicRoomState } from "../utils/types.ts";

let timerInterval: any = null;

export function render(data: any) {
  const wordToDraw = document.getElementById("wordToDraw") as HTMLElement;

  if (data.word) {
    if (wordToDraw) wordToDraw.textContent = `Mot à dessiner : ${data.word}`;
  }
}

export function renderPlayers(roomState: PublicRoomState) {
  const playersList = document.getElementById(
    "playersList",
  ) as HTMLUListElement;
  if (!playersList) return;

  playersList.innerHTML = "";
  const sortedPlayers = [...roomState.players].sort(
    (a, b) => (b.score || 0) - (a.score || 0),
  );

  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    const li = document.createElement("li");
    li.className = "player-item";

    const leftGroup = document.createElement("div");
    leftGroup.style.display = "flex";
    leftGroup.style.alignItems = "center";

    const rankSpan = document.createElement("span");
    rankSpan.className = "player-rank";
    rankSpan.textContent = `#${i + 1}`;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = player.username;

    leftGroup.appendChild(rankSpan);
    leftGroup.appendChild(nameSpan);

    const scoreSpan = document.createElement("span");
    scoreSpan.className = "player-score";
    scoreSpan.textContent = `${player.score || 0} pt`;

    li.appendChild(leftGroup);
    li.appendChild(scoreSpan);
    playersList.appendChild(li);
  }
}

function setChatEnabled(enabled: boolean) {
  const input = document.getElementById("guessInput") as HTMLInputElement;
  const btn = document.getElementById("sendGuess") as HTMLButtonElement;
  if (input) input.disabled = !enabled;
  if (btn) btn.disabled = !enabled;
  if (input)
    input.placeholder = enabled
      ? "Devinez le mot ici..."
      : "Tu es le dessinateur !";
}

export function init() {
  const leaveGameBtn = document.getElementById(
    "leaveGameBtn",
  ) as HTMLButtonElement;
  const gameTimer = document.getElementById("gameTimer");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const finalRankingList = document.getElementById("finalRankingList");

  if (leaveGameBtn) {
    leaveGameBtn.addEventListener("click", () => {
      socket.emit("leave_room");
    });
  }

  socket.on("send_words", (words: [string, string, string]) => {
    setChatEnabled(false);
    showWordChoice(words);
  });

  socket.on("drawing_started", (data: { drawerId: string; word: string }) => {
    const wordToDraw = document.getElementById("wordToDraw") as HTMLElement;
    const isDrawer = data.drawerId === socket.id;
    if (wordToDraw) {
      wordToDraw.textContent = isDrawer
        ? `Mot à dessiner : ${data.word}`
        : "Devinez le mot !";
    }
    setChatEnabled(!isDrawer);

    // --- GESTION DU TIMER LOCAL ---
    if (gameTimer) {
      let timeLeft = 80;
      gameTimer.textContent = `⏱️ ${timeLeft}s`;

      if (timerInterval) clearInterval(timerInterval);

      timerInterval = setInterval(() => {
        timeLeft--;
        gameTimer.textContent = `⏱️ ${timeLeft}s`;
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
        }
      }, 1000);
    }
  });

  socket.on("new_turn", (data: { drawerId: string }) => {
    const wordToDraw = document.getElementById("wordToDraw") as HTMLElement;
    const isDrawer = data.drawerId === socket.id;

    if (wordToDraw) {
      wordToDraw.textContent = isDrawer
        ? "Choisis un mot…"
        : "Devinez le mot !";
    }
    setChatEnabled(!isDrawer);

    if (timerInterval) {
      clearInterval(timerInterval);
      if (gameTimer) gameTimer.textContent = "⏱️ 80s";
    }
  });

    socket.on('manche_over', () => {
        const wordToDraw = document.getElementById('wordToDraw') as HTMLElement;
        wordToDraw.textContent = 'Manche terminée ! Retour au lobby...';
        setChatEnabled(false);
        setTimeout(() => { window.location.href = '/'; }, 3000);
    });
}

function showWordChoice(words: [string, string, string]) {
    const section = document.getElementById('wordChoice') as HTMLElement;
    const buttons = section.querySelectorAll('button');

    words.forEach((word, i) => {
        buttons[i].textContent = word;
        buttons[i].onclick = () => {
            socket.emit('word_chosen', word);
            section.classList.add('hidden');
        };
    });

    section.classList.remove('hidden');
}
