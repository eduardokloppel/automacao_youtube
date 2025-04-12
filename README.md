# Automação de Upload para YouTube

Este projeto automatiza o processo de upload de vídeos do Google Drive para o YouTube, com base em registros gerenciados pelo Airtable.

## Funcionalidades

- Busca vídeos pendentes no Airtable
- Seleciona um vídeo aleatório para upload
- Baixa o vídeo do Google Drive
- Faz upload para o YouTube
- Atualiza o status no Airtable
- Exclui o arquivo do Drive após o upload
- Programação automática de uploads em horários específicos

## Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
# Google API Credentials
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
YOUTUBE_API_KEY=sua_api_key

# Airtable Credentials
AIRTABLE_BASE_ID=seu_base_id
AIRTABLE_TOKEN_ID=seu_token
AIRTABLE_TABLE_NAME=Queue
AIRTABLE_TABLE_ID=seu_table_id

# Google Drive
DRIVE_FOLDER_ID=seu_folder_id
DRIVE_CLIENT_ID=seu_drive_client_id
DRIVE_CLIENT_SECRET=seu_drive_client_secret
DRIVE_REFRESH_TOKEN=seu_drive_refresh_token

# Canal Alternativo YouTube
GOOGLE_CLIENT_ID_MIU=seu_client_id_alternativo
GOOGLE_CLIENT_SECRET_MIU=seu_client_secret_alternativo
YOUTUBE_REFRESH_TOKEN_MIU=seu_refresh_token_alternativo
```

### 2. Instalação de Dependências

```bash
npm install
```

### 3. Teste Local

Para testar localmente:

```bash
# Processar um vídeo aleatório
node processar-fila.js

# Executar com o servidor Vercel de desenvolvimento
npm run dev
```

## Implantação no Vercel

### 1. Configurar o projeto no Vercel

1. Crie uma conta no [Vercel](https://vercel.com) se ainda não tiver
2. Instale a CLI do Vercel:
   ```bash
   npm install -g vercel
   ```
3. Faça login na Vercel:
   ```bash
   vercel login
   ```
4. Implante o projeto:
   ```bash
   vercel
   ```

### 2. Configurar Agendamento com Upstash QStash

Para agendar execuções automáticas a cada 1h30 entre 7h00 e 22h00 (horário do Brasil):

1. Crie uma conta no [Upstash](https://upstash.com/)
2. Na seção QStash, crie um novo agendamento
3. Configure o endpoint: `https://seu-projeto.vercel.app/api/processQueue`
4. Configure a expressão cron para execuções a cada 1h30 entre 7h e 22h:
   ```
   */90 7-22 * * *
   ```

Observações:
- O endpoint `api/processQueue` verifica automaticamente o horário do Brasil antes de processar vídeos
- Fora do horário permitido (7h às 22h), o processamento é ignorado
- A seleção de vídeos é aleatória entre os disponíveis com status "Pending"

## Uso Manual da API

Você pode acionar o upload manualmente fazendo uma requisição POST:

```bash
curl -X POST https://seu-projeto.vercel.app/api/processQueue -H "Content-Type: application/json" -d '{"account":"miu09622"}'
```

Parâmetros:
- `account`: (opcional) Qual conta do YouTube usar (padrão: "miu09622")

## Manutenção

Para obter um novo refresh token:

1. Para token do YouTube:
   ```bash
   node obter-refresh-token.js
   ```

2. Para token do Drive:
   ```bash
   node obter-refresh-token-drive.js
   ```

Alternativamente, use o Google OAuth Playground (https://developers.google.com/oauthplayground/). 