import { showError, clearError } from '../utils/error.ts';

const usernameInput = document.getElementById('usernameInput') as HTMLInputElement;
const validBox = document.getElementById('validBox') as HTMLElement;

let isUsernameValidated = false;

export function getUsername() {
  return usernameInput.value.trim();
}

export function isValidated() {
  return isUsernameValidated;
}

export function setValidatedState(value: boolean) {
  isUsernameValidated = value;
  validBox.textContent = value ? `Pseudo valide: ${getUsername()}` : '';
}

export function validateUsernameOrShowError() {
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

export function init() {
  const validateBtn = document.getElementById('validateUsernameBtn') as HTMLButtonElement;

  validateBtn.addEventListener('click', () => {
    validateUsernameOrShowError();
  });

  usernameInput.addEventListener('input', () => {
    if (isUsernameValidated) setValidatedState(false);
  });
}
