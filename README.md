# 🛒 Smooth Vendas

Bot de vendas completo para o servidor **Smooth Roblox**, com pagamento via Pix (QR Code real gerado na hora), categorias e produtos 100% editáveis pelo Discord, estoque com entrega automática por DM, e um painel de administração fixo para configurar tudo sem tocar em código.

---

## ✨ Funcionalidades

- `!vender` → posta o painel de vendas no canal desejado (qualquer canal do servidor).
- `!painel` → posta o **painel de administração fixo**, com botões para configurar:
  - 🔑 **Chave Pix** (chave, nome do recebedor, cidade)
  - 📁 **Categorias** (criar, editar, excluir)
  - 📦 **Produtos** (criar, editar, excluir, adicionar estoque)
  - 🎨 **Personalização** do painel de vendas (título, descrição, cor, imagem, thumbnail)
  - 📋 **Canal de logs** (onde chegam os pedidos para aprovação)
  - 👑 **Cargo administrador** da loja (além de quem tem permissão de Administrador)
- QR Code Pix **gerado na hora**, no padrão oficial do Banco Central (BR Code / EMV), com CRC16 validado.
- Fluxo de compra: cliente escolhe categoria → escolhe produto → recebe QR Code + Pix Copia e Cola → clica em "Já paguei" → pedido vai para o canal de logs → staff aprova → produto é **entregue automaticamente por DM** (tira 1 item do estoque).
- Tudo editável pelo Discord: nome de categorias, nome de produtos, preços, descrições, estoque, textos do painel, cor do embed, imagens, canal de logs, cargo admin.
- Keepalive HTTP embutido (Express) para o bot não "dormir" no Railway.

---

## 🚀 Como rodar localmente

1. Instale o [Node.js 18+](https://nodejs.org/).
2. Extraia esse projeto e abra um terminal na pasta.
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Copie `.env.example` para `.env` e preencha o `TOKEN` do bot:
   ```bash
   cp .env.example .env
   ```
5. Rode o bot:
   ```bash
   npm start
   ```

---

## 🤖 Criando o bot no Discord

1. Acesse https://discord.com/developers/applications e clique em **New Application**.
2. Dê o nome **Smooth Vendas** e crie.
3. Vá em **Bot** → **Reset Token** → copie o token e cole no `.env` (`TOKEN=...`).
4. Ainda em **Bot**, ative:
   - `MESSAGE CONTENT INTENT` (obrigatório para o comando `!vender` funcionar)
   - `SERVER MEMBERS INTENT`
5. Vá em **OAuth2 → URL Generator**:
   - Em **Scopes**, marque `bot`.
   - Em **Bot Permissions**, marque: `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `Use External Emojis`, `Manage Messages`.
6. Copie o link gerado e use para convidar o bot no servidor **Smooth Roblox**.

---

## ☁️ Deploy no Railway

1. Crie um repositório no GitHub com esses arquivos e suba o projeto (ou use o botão "Deploy from GitHub" do Railway).
2. No Railway, crie um novo projeto a partir do repositório.
3. Em **Variables**, adicione:
   - `TOKEN` → o token do seu bot
   - `PREFIX` → `!` (opcional, já é o padrão)
   - O Railway já define `PORT` sozinho — não precisa mexer.
4. O Railway vai rodar `npm install` e depois `npm start` automaticamente (definido no `package.json`).
5. Como o bot sobe um servidor Express (`src/keepalive.js`) na porta indicada pelo Railway, ele responde ao "health check" e evita que o serviço fique marcado como inativo.
6. Pronto — o bot ficará online 24/7.

> 💡 Dica: se o Railway pedir um domínio público, pode gerar um em **Settings → Networking → Generate Domain**. Ele não precisa ser usado por ninguém, serve só para o keepalive funcionar corretamente como serviço web.

---

## ☁️ Deploy no Render (alternativa ao Railway)

O projeto já funciona no Render sem nenhuma alteração de código — o `src/keepalive.js` escuta a porta definida por `process.env.PORT`, que é exatamente o que o Render exige de um Web Service.

1. Suba o projeto para um repositório no GitHub.
2. Em https://render.com, clique em **New +** → **Web Service** e conecte o repositório.
3. Configure:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Em **Environment**, adicione a variável `TOKEN` com o token do seu bot (`PREFIX` é opcional).
5. Escolha o plano:
   - **Free:** funciona, mas o serviço "dorme" após 15 minutos sem receber requisições HTTP — o que derrubaria o bot.
   - **Starter (pago, ~$7/mês):** fica sempre online, sem truques.
6. Clique em **Create Web Service**. Quando os logs mostrarem `✅ Smooth Vendas online`, o bot está no ar.
7. A URL pública gerada (ex: `smooth-vendas.onrender.com`) mostra o site com o total de vendas, categorias e produtos mais vendidos.

**Se ficar no plano Free:** crie uma conta gratuita no [UptimeRobot](https://uptimerobot.com) e configure um monitor HTTP pingando sua URL do Render a cada 5 minutos. Isso evita que o serviço "durma" e o bot caia.

> ⚠️ Assim como no Railway, o disco do Render também é efêmero — se as configurações (Pix, categorias, produtos) sumirem após um novo deploy, use um **Persistent Disk** (Render oferece na aba Disks) apontando para a pasta `data/`.

---

## 🛠️ Como usar no servidor

### 1. Configurar tudo pelo painel administrativo
No canal de administração, digite:
```
!painel
```
Um painel fixo vai aparecer com botões. Pode deixar esse painel fixado no canal — ele nunca expira.

Ordem sugerida de configuração:
1. Clique em **🔑 Configurar Pix** e preencha sua chave, nome e cidade.
2. Clique em **📁 Categorias → Criar categoria** (ex: "Contas Roblox", "Robux", "Gamepasses").
3. Clique em **📦 Produtos**, selecione a categoria e adicione produtos (nome, preço, descrição e estoque inicial — um item por linha, pode ser login/senha, código, link, etc).
4. (Opcional) Clique em **🎨 Personalizar Painel** para mudar título, descrição, cor e imagens da loja.
5. Clique em **📋 Canal de Logs** e escolha o canal onde a equipe vai aprovar os pagamentos.
6. Clique em **👑 Cargo Admin** para liberar outros membros da staff a gerenciar a loja e aprovar pedidos (sem precisar ser Administrador do servidor).

### 2. Colocar o painel de vendas onde quiser
Vá até o canal onde os clientes vão comprar (ex: `#comprar`) e digite:
```
!vender
```
Isso posta o painel de vendas com o botão **🛒 Comprar**. Pode usar `!vender` em quantos canais quiser.

### 3. Fluxo de compra (automático)
1. Cliente clica em **Comprar** → escolhe a categoria → escolhe o produto.
2. O bot gera o QR Code Pix na hora (com o valor exato do produto) + o código "Copia e Cola".
3. Cliente paga e clica em **Já paguei**.
4. O pedido aparece no canal de logs para a staff aprovar.
5. Staff clica em **Aprovar e entregar** → o bot manda o item do estoque automaticamente por DM para o cliente.
   Ou clica em **Recusar** → o cliente é avisado por DM.

---

## 📁 Estrutura do projeto

```
smooth-vendas/
├── src/
│   ├── index.js                     # inicialização do bot
│   ├── keepalive.js                 # servidor HTTP para o Railway
│   ├── pix.js                       # geração do payload Pix + QR Code
│   ├── store.js                     # persistência (config, categorias, produtos, pedidos)
│   ├── embeds.js                    # embeds reutilizáveis
│   ├── commands/
│   │   ├── vender.js                # comando !vender
│   │   └── painel.js                # comando !painel
│   └── interactions/
│       ├── panelInteractions.js     # botões/modais do painel admin
│       └── shopInteractions.js      # botões/selects da loja (compra, aprovação, entrega)
├── data/
│   ├── config.json                  # gerado automaticamente na primeira execução
│   └── orders.json                  # gerado automaticamente na primeira execução
├── package.json
├── .env.example
└── README.md
```

Tudo em `data/` é criado automaticamente e salvo em disco — todas as edições feitas pelo Discord (Pix, categorias, produtos, estoque, textos, cores, canal de logs, cargo admin) ficam gravadas ali permanentemente.

> ⚠️ No Railway, o sistema de arquivos é **efêmero** em alguns planos (o conteúdo pode ser resetado a cada novo deploy). Se isso acontecer com seu plano, adicione um **Volume** no Railway apontando para a pasta `data/` do projeto, assim as configurações não se perdem entre deploys.

---

## 🔒 Permissões

- Por padrão, apenas quem tem permissão de **Administrador** no servidor pode usar `!painel`, `!vender`, e aprovar/recusar pedidos.
- Você pode liberar outros cargos (ex: "Vendedor") usando o botão **👑 Cargo Admin** dentro do `!painel`, sem precisar dar Administrador para ninguém.

---

## ❓ Sobre a confirmação de pagamento

Esse bot usa **Pix estático com confirmação manual da equipe** (não depende de nenhuma API paga de gateway de pagamento). Isso significa:
- O QR Code é 100% real e válido, gerado localmente, sem custo e sem terceiros.
- A confirmação de que o dinheiro caiu é feita pela sua equipe (extrato do banco/app do Pix), clicando em "Aprovar" — isso evita fraude de comprovante falso, já que a entrega só acontece depois da aprovação manual.
- Se no futuro você quiser confirmação 100% automática, seria necessário integrar uma API de gateway Pix (ex: Mercado Pago, Efí, Asaas), o que pode ser adicionado depois nesse mesmo projeto.
