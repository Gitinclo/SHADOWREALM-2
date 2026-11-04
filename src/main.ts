import { game } from './game';
import { VoxelRealmsHUD } from './systems/VoxelRealmsHUD';
import {
  getCurrentSignedInUser,
  isUserAdmin,
  applyAdminUIUnlockState,
  signInUser,
} from './game/auth';
import { SUPREME_ADMIN_EMAIL } from './game/adminGMControl';

// Ensure the loading overlay hides gracefully, verify signed-in user role ('creatergame31@gmail.com'),
// and unlock administrative controls in the UI if the admin user is signed in.
window.addEventListener('DOMContentLoaded', () => {
  const hud = VoxelRealmsHUD.getInstance();

  // Authenticate current user & check if 'creatergame31@gmail.com' is signed in with 'admin' role
  let currentUser = getCurrentSignedInUser();
  if (!currentUser.isSignedIn) {
    currentUser = signInUser(SUPREME_ADMIN_EMAIL);
  }

  if (isUserAdmin(currentUser)) {
    applyAdminUIUnlockState(currentUser);
    hud.setAuthenticatedUser(currentUser);
  } else {
    applyAdminUIUnlockState(currentUser);
  }

  setTimeout(() => {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  }, 450);

  // Chat toggle on Enter key when not typing inside a modal input
  const chatBox = document.getElementById('chat');
  const chatInput = document.querySelector<HTMLInputElement>('#chat-input input');

  window.addEventListener('keydown', (e) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      if (e.key === 'Enter' && e.target === chatInput && chatInput.value.trim()) {
        const msgList = document.getElementById('chat-messages');
        if (msgList) {
          const line = document.createElement('div');
          line.style.marginBottom = '4px';
          line.innerHTML = `<span style="color:#fbbf24;font-weight:bold;">[You]:</span> ${chatInput.value.trim()}`;
          msgList.appendChild(line);
          msgList.scrollTop = msgList.scrollHeight;
        }
        chatInput.value = '';
      }
      return;
    }

    if (e.key === 'Enter' && chatBox) {
      const isHidden = chatBox.style.display === 'none' || !chatBox.style.display;
      chatBox.style.display = isHidden ? 'flex' : 'none';
      if (isHidden) {
        setTimeout(() => chatInput?.focus(), 20);
      }
    }
  });
});

export { game };
