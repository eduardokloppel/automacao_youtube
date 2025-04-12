# Guia de Configuração do YouTube e Google Cloud

Este guia ajudará você a configurar o projeto Google Cloud e obter as credenciais necessárias para a conta miu09622@gmail.com.

## 1. Criar um projeto no Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Faça login com a conta **miu09622@gmail.com**
3. Clique no menu suspenso de projetos no topo da página
4. Clique em "Novo Projeto"
5. Dê um nome ao projeto (ex: "YouTube Upload Automation")
6. Clique em "Criar"
7. Aguarde até que o projeto seja criado e selecionado

## 2. Ativar a API do YouTube

1. No menu lateral, clique em "APIs e Serviços" > "Biblioteca"
2. Na barra de pesquisa, digite "YouTube Data API v3"
3. Clique no cartão da API quando ela aparecer
4. Clique no botão "Ativar"

## 3. Configurar a tela de consentimento OAuth

1. No menu lateral, clique em "APIs e Serviços" > "Tela de consentimento OAuth"
2. Selecione "Externo" para o tipo de usuário (pois você não tem um domínio G Suite)
3. Clique em "Criar"
4. Preencha as informações necessárias:
   - Nome do aplicativo: "YouTube Upload Automation"
   - E-mail para suporte: use o email miu09622@gmail.com
   - Logo: (opcional)
   - Domínio do app: (pode deixar em branco)
   - E-mail para contato do desenvolvedor: use o email miu09622@gmail.com
5. Clique em "Salvar e continuar"
6. Na tela de "Escopos", clique em "Adicionar ou remover escopos"
7. Pesquise e selecione os seguintes escopos:
   - `https://www.googleapis.com/auth/youtube` (Gerenciar sua conta do YouTube)
   - `https://www.googleapis.com/auth/youtube.upload` (Gerenciar seus vídeos do YouTube)
8. Clique em "Atualizar" e depois em "Salvar e continuar"
9. Na tela de "Usuários de teste", adicione seu e-mail miu09622@gmail.com
10. Clique em "Salvar e continuar"
11. Revise todas as informações e clique em "Voltar para o painel"

## 4. Criar credenciais OAuth

1. No menu lateral, clique em "APIs e Serviços" > "Credenciais"
2. Clique no botão "Criar credenciais" e selecione "ID do cliente OAuth"
3. Em "Tipo de aplicativo", selecione "Aplicativo da Web"
4. Dê um nome para o ID do cliente (ex: "YouTube Upload Web App")
5. Em "URIs de redirecionamento autorizados", clique em "Adicionar URI" e digite:
   ```
   http://localhost:3000/oauth2callback
   ```
6. Clique em "Criar"
7. Uma janela pop-up aparecerá com seu ID do cliente e chave secreta do cliente
8. Clique no botão para fazer download do JSON ou copie essas informações:
   - ID do cliente (Client ID)
   - Chave secreta do cliente (Client Secret)

## 5. Configurar as credenciais no arquivo .env

1. Abra o arquivo `.env` do projeto
2. Adicione ou atualize as seguintes variáveis:
   ```
   GOOGLE_CLIENT_ID=seu_id_do_cliente
   GOOGLE_CLIENT_SECRET=sua_chave_secreta
   ```

## 6. Obter o Refresh Token para a conta miu09622@gmail.com

1. No terminal, execute o script de obtenção de token:
   ```
   node obter-refresh-token.js
   ```
2. O script abrirá uma página no navegador (ou fornecerá uma URL)
3. Faça login com a conta **miu09622@gmail.com**
4. Conceda as permissões solicitadas
5. Você será redirecionado para localhost e o script exibirá o Refresh Token
6. Adicione este token ao arquivo `.env`:
   ```
   YOUTUBE_REFRESH_TOKEN_MIU=seu_refresh_token
   ```

## 7. Testar a configuração

1. No terminal, execute o script de teste de contas:
   ```
   node teste-contas.js
   ```
2. Verifique se ambas as contas (eduardoalveskloppel e miu09622) estão funcionando corretamente

## 8. Fazer um teste de upload

1. Execute o script de teste de upload para a conta miu09622:
   ```
   node teste-detalhado.js miu09622
   ```
2. Verifique se o script consegue se conectar ao canal e listar os vídeos

## Solução de problemas

- Se receber erros de autenticação, verifique se o refresh token está correto e tente gerá-lo novamente.
- Se receber erros de API, verifique se a YouTube Data API v3 está ativada no seu projeto.
- Se o script não conseguir abrir o navegador automaticamente, copie a URL fornecida e abra manualmente.
- Certifique-se de que o arquivo `.env` está salvo com as credenciais corretas e no formato adequado. 