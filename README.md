# KVINX WORLD — site de inscrições

Site em português com visual preto/vermelho, links para Discord e Minecraft, formulário de inscrição e painel administrativo em `/admin`.

## O que está pronto
- Botão Discord abre `https://discord.gg/kXfFSs5r4` em nova aba.
- Botão Minecraft abre uma janela dentro do site e copia `kvinx-world.aternos.net`.
- Formulário exige nome, Discord = Sim e resposta sobre conversar.
- Respostas são salvas no arquivo `data/registrations.json`.
- Painel `/admin` protegido por senha de ambiente, lista inscrições e exporta CSV.
- A verificação real de existência do nome de usuário ainda NÃO está implementada.

## Executar localmente
Requer Node.js 20 ou superior.
1. Extraia o ZIP.
2. Abra o terminal na pasta `kvinx-world-site`.
3. Execute `npm install`.
4. Copie `.env.example` para `.env`.
5. No `.env`, defina `ADMIN_PASSWORD` com uma senha exclusiva e longa e `SESSION_SECRET` com um segredo aleatório de pelo menos 32 caracteres.
6. Execute `npm start`.
7. Acesse `http://localhost:3000`; o painel fica em `http://localhost:3000/admin`.

Gere um segredo com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Não publique nem envie seu `.env` a ninguém.

## Hospedar
A aplicação é Node.js e precisa de hospedagem que execute um servidor Node, não apenas hospedagem estática. Configure:
- Build command: `npm install`
- Start command: `npm start`
- Environment: `NODE_ENV=production`
- Variáveis secretas: `ADMIN_PASSWORD`, `SESSION_SECRET`
- `DATA_DIR`: caminho de um disco persistente montado pela hospedagem, por exemplo `/var/data`, e monte um disco persistente nesse caminho.
Sem disco persistente, algumas hospedagens podem apagar inscrições quando reiniciarem ou fizerem novo deploy. Faça backups regulares do CSV pelo painel.

## Rotas
- `/` site público
- `/admin` painel privado
- `POST /api/register` criar inscrição
- `POST /api/admin/login` autenticar administrador
- `GET /api/admin/registrations` listar (autenticado)
- `GET /api/admin/export.csv` exportar CSV (autenticado)

## Importante antes de publicar
- Use HTTPS na hospedagem.
- Nunca coloque senha administrativa no HTML ou no JavaScript do navegador.
- Defina uma senha longa e não a reutilize em outros serviços.
- Esta versão coleta apenas o nome digitado e as duas respostas. Não pede senha do Discord.
- A verificação automática de usuário, prevenção avançada de fraude, política de privacidade e regras oficiais do sorteio ainda precisam ser definidas antes de uma campanha pública.
- O arquivo JSON é adequado para um projeto pequeno com poucas inscrições e uma única instância de servidor. Para alto volume ou múltiplas instâncias, migre para um banco de dados gerenciado.
