// Account access only. No signing, token approval, transfers, or game calls.
(() => {
  const button = document.querySelector('.connect-wallet');
  const disconnectButton = document.querySelector('.disconnect-wallet');
  const menu = document.querySelector('#wallet-actions');
  const feedback = document.querySelector('.wallet-feedback');
  const providers = new Map();
  let provider = null;
  let account = '';
  let pending = false;
  let message = '';
  const copy = {
    en: {connect:'Connect Wallet', connecting:'Connecting…', disconnect:'Disconnect', disconnected:'Disconnected from this site. Wallet permissions and token allowances remain unchanged.', connected:'Wallet connected. Participation is not open yet.', missing:'Open this site in your wallet’s browser, or use a browser with a wallet extension.', rejected:'Connection cancelled.', waiting:'A wallet request is already pending. Open your wallet to continue.', failed:'Unable to connect. Please check your wallet and try again.'},
    'zh-CN': {connect:'连接钱包', connecting:'连接中…', disconnect:'断开连接', disconnected:'已断开本站连接。钱包权限及代币授权保持不变。', connected:'钱包已连接，参与功能尚未开放。', missing:'请在钱包内置浏览器打开本站，或使用安装了钱包扩展的浏览器。', rejected:'已取消连接。', waiting:'已有钱包请求等待处理，请打开钱包继续。', failed:'连接失败，请检查钱包后重试。'}
  };
  function render() {
    const text = copy[document.documentElement.lang] || copy.en;
    button.disabled = pending;
    button.textContent = pending ? text.connecting : account ? account.slice(0,6)+'…'+account.slice(-4) : text.connect;
    button.title = account;
    button.setAttribute('aria-label', account ? account : text.connect);
    disconnectButton.textContent = text.disconnect;
    if (!account) closeMenu();
    feedback.hidden = !message;
    feedback.textContent = message ? text[message] : '';
  }
  function closeMenu() { menu.hidden = true; button.setAttribute('aria-expanded','false'); }
  disconnectButton.addEventListener('click', () => {
    selectProvider(null); account = ''; message = 'disconnected'; closeMenu(); render();
  });
  document.addEventListener('click', event => { if (!event.target.closest('.wallet-menu')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); if (account) button.focus(); } });
  function accountsChanged(accounts) {
    account = Array.isArray(accounts) && /^0x[0-9a-fA-F]{40}$/.test(accounts[0] || '') ? accounts[0] : '';
    message = account ? 'connected' : '';
    render();
  }
  function disconnected() { accountsChanged([]); }
  function selectProvider(next) {
    if (provider === next) return;
    if (provider?.removeListener) {
      provider.removeListener('accountsChanged',accountsChanged);
      provider.removeListener('disconnect',disconnected);
    }
    provider = next;
    if (provider?.on) {
      provider.on('accountsChanged',accountsChanged);
      provider.on('disconnect',disconnected);
    }
  }
  window.addEventListener('eip6963:announceProvider', event => {
    const detail = event.detail;
    if (detail?.provider?.request && typeof detail.info?.uuid === 'string') providers.set(detail.info.uuid, detail);
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  button.addEventListener('click', async () => {
    if (pending) return;
    if (account) { menu.hidden = !menu.hidden; button.setAttribute('aria-expanded',String(!menu.hidden)); return; }
    // Prefer the existing session. Fall back to the browser's selected injected wallet.
    const announced = [...providers.values()];
    const next = provider || window.ethereum || announced.find(p => p.info.rdns === 'io.metamask')?.provider || announced[0]?.provider;
    if (!next?.request) { message = 'missing'; render(); return; }
    selectProvider(next);
    pending = true; message = ''; render();
    try { accountsChanged(await provider.request({method:'eth_requestAccounts'})); }
    catch (error) { message = error?.code === 4001 ? 'rejected' : error?.code === -32002 ? 'waiting' : 'failed'; }
    finally { pending = false; render(); }
  });
  window.addEventListener('fomo6-language-changed',render);
  render();
})();
