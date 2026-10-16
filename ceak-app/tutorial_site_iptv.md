# 🚀 Passo a Passo: Criando seu Site de IPTV no Antigravity, Subindo no GitHub e Hospedando na Vercel

Este guia prático foi criado para ajudar você a construir um site moderno e profissional para IPTV utilizando o **Antigravity**, publicar seu código no **GitHub** e colocar o site no ar de forma totalmente gratuita usando a **Vercel**.

---

## 📑 Sumário
1. [Etapa 1: Criando o Site no Antigravity](#etapa-1-criando-o-site-no-antigravity)
2. [Etapa 2: Subindo o Código no GitHub](#etapa-2-subindo-o-código-no-github)
3. [Etapa 3: Publicando o Site na Vercel](#etapa-3-publicando-o-site-na-vercel)
4. [Etapa 4: Como Fazer Atualizações Futuras](#etapa-4-como-fazer-atualizações-futuras)
5. [💡 Dicas Bônus para Sites de IPTV](#-dicas-bônus-para-sites-de-iptv)

---

## 🎨 Etapa 1: Criando o Site no Antigravity

No **Antigravity**, você pode solicitar que a IA crie toda a estrutura visual e interativa do seu site.

### 1.1 O que pedir para o Antigravity?
Copie e cole uma mensagem semelhante a esta no chat do Antigravity para criar um site incrível:

> *"Crie um site moderno e premium para exibição e venda de planos de IPTV. O site deve ter:*
> - *Tema escuro (Dark Mode) profissional com detalhes em neon/gradientes suaves.*
> - *Cabeçalho com logo, menu de navegação e botão de contato.*
> - *Sessão Hero impactante com chamada para ação ('Solicitar Teste Grátis').*
> - *Grid de Planos (Mensal, Trimestral, Anual) com destaques de preço e recursos.*
> - *Seção de Compatibilidade (Smart TV, TV Box, Celular, Computador).*
> - *Sessão FAQ (Perguntas Frequentes) com efeito sanfona (accordion).*
> - *Botão flutuante do WhatsApp para atendimento direto.*
> - *Layout 100% responsivo para celulares e computadores."*

### 1.2 Estrutura Básica dos Arquivos
O Antigravity criará os arquivos principais na sua pasta de trabalho:
- `index.html` (Estrutura e conteúdo da página)
- `style.css` (Cores, fontes, animações e visual)
- `script.js` (Interatividade, FAQs, botões)

---

## 🐙 Etapa 2: Subindo o Código no GitHub

O GitHub serve para guardar o seu código-fonte na nuvem com segurança e se conectar diretamente com a Vercel.

### 2.1 Pré-requisitos
1. Crie uma conta gratuita em [github.com]() (caso ainda não tenha).
2. Verifique se o [Git](https://git-scm.com/) está instalado no seu computador.

### 2.2 Criando um Novo Repositório no GitHub
1. Acesse o [GitHub](https://github.com/) e clique no botão **"+"** no canto superior direito -> **New repository**.
2. Digite o nome do repositório (exemplo: `site-iptv-oficial`).
3. Escolha se deseja que ele seja **Public** (Público) ou **Private** (Privado).
4. **Importante:** Não marque a opção de adicionar `README` ou `.gitignore` agora.
5. Clique em **Create repository**.

### 2.3 Enviando os Arquivos do Antigravity para o GitHub
No terminal do Antigravity (ou no PowerShell/CMD dentro da pasta do projeto), execute os seguintes comandos:

```bash
# 1. Inicializa o repositório Git local
git init

# 2. Adiciona todos os arquivos do projeto
git add .

# 3. Cria a primeira versão (commit)
git commit -m "Primeiro commit - Site IPTV completo"

# 4. Renomeia o ramo principal para 'main'
git branch -M main

# 5. Conecta seu projeto ao repositório do GitHub (Substitua a URL pela URL do seu repositório)
git remote add origin https://github.com/SEU-USUARIO/site-iptv-oficial.git

# 6. Envia o código para o GitHub
git push -u origin main
```

---

## ⚡ Etapa 3: Publicando o Site na Vercel

A Vercel hospedará seu site de forma rápida, segura e com certificado SSL (HTTPS) gratuito.

### 3.1 Conectando a Vercel ao GitHub
1. Acesse [vercel.com](https://vercel.com/) e clique em **Sign Up** ou **Log In**.
2. Escolha a opção **Continue with GitHub** para integrar suas contas automaticamente.

### 3.2 Importando e Fazendo o Deploy
1. No painel da Vercel (Dashboard), clique no botão **Add New...** -> **Project**.
2. Na lista de repositórios do GitHub, encontre o repositório `site-iptv-oficial` e clique em **Import**.
3. Em **Framework Preset**, se for um site em HTML/CSS simples, a Vercel detectará como *Other*. Se for feito com Vite/React, a Vercel configurará automaticamente.
4. Clique no botão **Deploy**.
5. Aguarde alguns segundos. Quando aparecer a tela de parabéns (com confetes 🎉), seu site já estará no ar!
6. Clique no link gerado (exemplo: `https://site-iptv-oficial.vercel.app`) para visualizar o site ao vivo.

---

## 🔄 Etapa 4: Como Fazer Atualizações Futuras

Uma das maiores vantagens da Vercel é a atualização automática:

1. Sempre que fizer uma alteração ou melhoria no código no Antigravity, abra o terminal e rode:
   ```bash
   git add .
   git commit -m "Atualizando preços e botão de WhatsApp"
   git push
   ```
2. A Vercel detectará a mudança no GitHub e **atualizará o site automaticamente em segundos**!

---

## 💡 Dicas Bônus para Sites de IPTV

1. **Botão Direto para o WhatsApp**:
   Coloque um link direto formatado com mensagem automática:
   `https://wa.me/55DDDNUMERO?text=Olá,%20gostaria%20de%20solicitar%20um%20teste%20grátis%20de%20IPTV!`

2. **Domínio Personalizado**:
   Se você comprar um domínio próprio (ex: `www.seuportaliptv.com.br`), você pode adicioná-lo na Vercel em:
   *Project Settings -> Domains -> Add*.

3. **Imagens de Alta Qualidade**:
   Peça ao Antigravity para usar ícones modernos (como Lucide Icons ou FontAwesome) para representar TVs, Celulares e Filmes.

---

*Pronto! Agora o seu amigo tem o passo a passo completo para criar, publicar e manter um site de IPTV profissional.* 🚀
