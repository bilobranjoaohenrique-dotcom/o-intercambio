# Publicar O Intercâmbio na Vercel

O projeto está preparado para publicação como site estático. A configuração já está em `vercel.json`; não é necessário backend, banco de dados ou chave de API para jogar.

## Importar o repositório

Depois que o projeto estiver no seu GitHub:

1. Entre na sua conta da [Vercel](https://vercel.com/new).
2. Em **Import Git Repository**, escolha o repositório **o-intercambio**. Se ele não aparecer, use **Adjust GitHub App Permissions** para permitir que a Vercel o veja.
3. Confira as opções abaixo. As opções de instalação, build e saída já são preenchidas pelo arquivo do projeto.
4. Clique em **Deploy** e aguarde o término.
5. Abra o endereço gerado pela Vercel e clique em **Começar**.

| Opção | Valor |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | `.` — raiz do repositório |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | `24.x` |
| Environment Variables | Nenhuma |

Não use `npm run dev` como comando de build. A Vercel gera `dist` a partir do código; não é necessário enviar `node_modules` ou o build local ao GitHub.

## Conferir a publicação

No endereço publicado, confira o despertar, a legenda da mãe, WASD e mouse, a porta e a descida até a cozinha. Continue a missão pelos diálogos escritos, portão, avião e encontro com a família anfitriã. Personagens não têm voz; o áudio é apenas ambiência e efeitos. Use computador nesta versão.

Não considere a publicação verificada até abrir e jogar a sequência no endereço que a Vercel gerar.

## Atualizações

Com o repositório conectado, novos commits enviados para `main` iniciam novas publicações de produção na Vercel. As preferências do jogo são guardadas separadamente por endereço de site; as configurações de `localhost` não são transferidas para o site publicado.
