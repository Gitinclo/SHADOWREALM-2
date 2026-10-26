import { game } from './game';

// Initialize the game
console.log('ShadowRealm MMORPG Starting...');

const hideLoadingOverlay = () => {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
};

if (game.isBooted) {
  hideLoadingOverlay();
} else {
  game.events.once('ready', hideLoadingOverlay);
  setTimeout(hideLoadingOverlay, 800);
}

// Handle window resize
window.addEventListener('resize', () => {
  game.scale.refresh();
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.scene.getScenes(true).forEach((scene) => {
      game.scene.pause(scene.scene.key);
    });
  } else {
    game.scene.getScenes(false).forEach((scene) => {
      if (game.scene.isPaused(scene.scene.key)) {
        game.scene.resume(scene.scene.key);
      }
    });
  }
});

// Chat box Enter toggle
window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const chatEl = document.getElementById('chat');
    const chatInput = document.querySelector<HTMLInputElement>('#chat-input input');
    const chatMessages = document.getElementById('chat-messages');
    if (!chatEl || !chatInput || !chatMessages) return;

    const isVisible = chatEl.style.display === 'flex';
    if (!isVisible) {
      chatEl.style.display = 'flex';
      chatInput.focus();
    } else if (document.activeElement === chatInput) {
      const text = chatInput.value.trim();
      if (text) {
        const msgDiv = document.createElement('div');
        msgDiv.style.marginBottom = '4px';
        msgDiv.innerHTML = `<span style="color:#b366ff;font-weight:bold;">[You]:</span> ${text.replace(/</g, '&lt;')}`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        chatInput.value = '';
      }
      chatInput.blur();
      chatEl.style.display = 'none';
    } else {
      chatInput.focus();
    }
  }
});

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

export { game };
