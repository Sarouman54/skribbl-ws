export function showError(message: string) {
  const el = document.getElementById('errorBox') as HTMLElement;
  el.textContent = message;
  el.style.display = 'block';
}

export function clearError() {
  const el = document.getElementById('errorBox') as HTMLElement;
  el.textContent = '';
  el.style.display = 'none';
}
