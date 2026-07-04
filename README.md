# Torneio de Praia — Rei & Rainha da Areia

App para organizar torneios de praia em dupla (Super 8, Super 10 e Super 12),
com rodízio automático de duplas, lançamento de placar, classificação e
exportação de texto para WhatsApp.

> **Sobre os dados:** esta versão salva tudo no `localStorage` do seu
> navegador. Ou seja, os torneios ficam guardados **apenas no aparelho e
> navegador onde você cadastrou** — não sincronizam entre pessoas nem entre
> dispositivos diferentes. Se quiser que várias pessoas lancem placar juntas
> em tempo real, é preciso trocar para um banco de dados online (ex.
> Firebase); posso te ajudar com isso depois, se precisar.

## Passo a passo para publicar no GitHub Pages

### 1. Criar o repositório no GitHub
1. Acesse [github.com/new](https://github.com/new).
2. Dê um nome ao repositório (ex.: `torneio-praia`).
3. Deixe como **Public** (necessário para o plano gratuito do GitHub Pages).
4. Crie o repositório **sem** adicionar README, .gitignore ou licença (para não conflitar com os arquivos deste projeto).

### 2. Enviar os arquivos deste projeto
No terminal, dentro da pasta deste projeto:

```bash
git init
git add .
git commit -m "Primeira versão do app de torneio de praia"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
git push -u origin main
```

> Troque `SEU-USUARIO` e `NOME-DO-REPOSITORIO` pelos dados do seu repositório.

### 3. Ativar o GitHub Pages
1. No GitHub, entre no repositório → aba **Settings**.
2. No menu lateral, clique em **Pages**.
3. Em **Build and deployment → Source**, selecione **GitHub Actions**.
4. Pronto — o workflow em `.github/workflows/deploy.yml` já está configurado
   e vai rodar automaticamente a cada `git push` na branch `main`.

### 4. Acompanhar a publicação
1. Na aba **Actions** do repositório, você verá o workflow "Deploy para
   GitHub Pages" rodando (leva cerca de 1-2 minutos).
2. Quando ficar verde ✅, volte em **Settings → Pages**: vai aparecer o link
   do site, algo como:
   `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`
3. Esse é o link que você compartilha com o grupo.

Depois disso, qualquer novo `git push` na branch `main` atualiza o site
sozinho, sem precisar repetir a configuração do Pages.

## Rodando localmente (opcional, para testar antes de publicar)

Precisa ter o [Node.js](https://nodejs.org/) instalado (versão 18 ou mais recente).

```bash
npm install     # instala as dependências (só precisa fazer uma vez)
npm run dev     # abre um servidor local, geralmente em http://localhost:5173
```

Para gerar a versão de produção manualmente:

```bash
npm run build     # gera a pasta dist/ pronta para publicar
npm run preview   # testa a versão de produção localmente
```

## Estrutura do projeto

```
torneio-praia-web/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx      → ponto de entrada React
│   └── App.jsx        → todo o app (telas, algoritmo de rodízio, etc.)
└── .github/workflows/deploy.yml → publica automaticamente no GitHub Pages
```

## Limitações desta versão web

- **Dados por dispositivo**: como os dados ficam no `localStorage`, se você
  limpar o cache/dados do navegador, ou trocar de aparelho, o histórico de
  torneios se perde. Vale fazer backup exportando os resultados (texto) pelo
  botão de compartilhar sempre que encerrar um torneio.
- **Sem sincronização entre pessoas**: cada pessoa que acessa o link vê e
  edita sua própria cópia dos dados, independente das outras. Para uso
  colaborativo (várias pessoas lançando placar do mesmo torneio ao mesmo
  tempo), é necessário um banco de dados online.
