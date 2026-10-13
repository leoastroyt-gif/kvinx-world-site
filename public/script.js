const minecraftBtn = document.querySelector('#minecraftBtn');
const ipDialog = document.querySelector('#ipDialog');
const copyIp = document.querySelector('#copyIp');
const copyStatus = document.querySelector('#copyStatus');
const closeDialog = document.querySelector('#closeDialog');
const form = document.querySelector('#signupForm');
const message = document.querySelector('#formMessage');

minecraftBtn.addEventListener('click', () => ipDialog.showModal());
closeDialog.addEventListener('click', () => ipDialog.close());
ipDialog.addEventListener('click', event => {
  if (event.target === ipDialog) ipDialog.close();
});
copyIp.addEventListener('click', async () => {
  const ip = 'kvinx-world.aternos.net';
  try {
    await navigator.clipboard.writeText(ip);
    copyStatus.textContent = 'IP COPIADO COM SUCESSO!';
  } catch {
    copyStatus.textContent = 'COPIE MANUALMENTE: kvinx-world.aternos.net';
  }
});

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message show ${type}`;
  message.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const username = document.querySelector('#username').value.trim();
  const discord = form.querySelector('input[name="hasDiscord"]:checked');
  const talk = form.querySelector('input[name="willingToTalk"]:checked');
  if (username.length < 2 || username.length > 40) return showMessage('Informe um nome de usuário com 2 a 40 caracteres.', 'error');
  if (!discord) return showMessage('Responda se você tem Discord.', 'error');
  if (discord.value === 'no') {
    showMessage('Discord é obrigatório. Entre no nosso servidor pelo botão Discord e depois volte para se inscrever.', 'error');
    form.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (!talk) return showMessage('Responda se está disposto(a) a falar.', 'error');
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.style.opacity = '.65';
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, hasDiscord: true, willingToTalk: talk.value === 'yes' })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível registrar a inscrição.');
    showMessage(data.message, 'success');
    form.reset();
  } catch (error) {
    showMessage(error.message || 'Erro de conexão. Tente novamente.', 'error');
  } finally {
    submit.disabled = false;
    submit.style.opacity = '1';
  }
});
