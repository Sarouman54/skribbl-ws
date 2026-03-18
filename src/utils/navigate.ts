export async function navigateTo(url: string, onReady: () => void) {
  const html = await fetch(url).then((r) => r.text());

  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  document.querySelector('.container')!.innerHTML = tmp.querySelector('.container')!.innerHTML;
  history.pushState({}, '', url);
  onReady();
}
