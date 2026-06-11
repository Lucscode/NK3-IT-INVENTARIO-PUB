# NK3IT - Inventário de TI 🚀

Bem-vindo ao repositório do **Sistema de Inventário de TI NK3IT**. Este projeto é uma aplicação web focada na gestão de ativos, colaboradores, movimentações, kits de boas-vindas e solicitações, utilizando **HTML, CSS, JavaScript (Vanilla)** no front-end e **Supabase (PostgreSQL + Auth + Storage)** no back-end.

---

## 🛠️ Tecnologias Utilizadas

- **Front-end:** HTML5, CSS3 (Variáveis, Flexbox, CSS Grid), JavaScript (ES6+). Sem frameworks pesados para garantir alta velocidade e facilidade de manutenção.
- **Back-end & Banco de Dados:** [Supabase](https://supabase.com/) (PostgreSQL).
- **Ícones:** Bootstrap Icons.

---

## 🚀 Como subir (Deploy) este projeto do zero

Se você deseja instalar e rodar este projeto em uma nova infraestrutura, siga os passos abaixo:

### Passo 1: Configurar o Supabase (Back-end)
1. Crie uma conta no [Supabase](https://supabase.com/) e crie um **New Project**.
2. No painel do seu projeto, vá até o **SQL Editor** (menu lateral esquerdo).
3. Copie todo o conteúdo do arquivo `schema.sql` que está na raiz deste projeto.
4. Cole no SQL Editor e clique em **RUN**. Isso irá criar todas as tabelas, políticas de segurança (RLS), triggers e configurações iniciais automaticamente.

### Passo 2: Configurar o Armazenamento de Fotos (Storage)
Ainda no Supabase, o sistema utiliza um bucket para armazenar as fotos dos equipamentos:
1. Vá até o menu **Storage**.
2. Clique em **New Bucket**.
3. Nomeie exatamente como: `fotos-ativos`.
4. **IMPORTANTE:** Marque a opção **"Public bucket"** (Isso é obrigatório para as fotos renderizarem no sistema).

### Passo 3: Conectar o Front-end ao seu Supabase
Para que o código HTML/JS consiga conversar com o seu banco de dados recém-criado, você precisa linkar as chaves:
1. No Supabase, vá em **Project Settings > API**.
2. Copie a URL do projeto (`Project URL`) e a Chave Pública (`anon` / `public` key).
3. Abra o arquivo `js/supabase.js` no seu editor de código.
4. Substitua os valores das variáveis no topo do arquivo pelas suas novas chaves:
   ```javascript
   const SUPABASE_URL = 'SUA_URL_AQUI';
   const SUPABASE_ANON_KEY = 'SUA_CHAVE_AQUI';
   ```

### Passo 4: Hospedar o site (Deploy do Front-end)
Como o projeto é totalmente estático (apenas arquivos HTML, CSS e JS, sem necessidade de Node.js no servidor), você pode hospedá-lo praticamente em qualquer lugar.

**Opção A: Infraestrutura Própria (Proxmox / On-Premise)**
Se você for subir internamente em um servidor próprio (ex: uma VM ou LXC no seu Proxmox), basta usar qualquer servidor web padrão:
1. Instale um servidor web como **Nginx** ou **Apache** na sua máquina virtual.
2. Copie todos os arquivos desta pasta raiz para o diretório público do servidor (por exemplo, `/var/www/html/` no Ubuntu/Debian).
3. Certifique-se de que o servidor está apontando para o arquivo `index.html`. Pronto! O sistema já estará rodando internamente na sua rede.
*(Também é perfeitamente possível usar uma imagem simples do Docker, como a `nginx:alpine`, mapeando esta pasta para dentro do container).*

**Opção B: Hospedagem em Nuvem (Gratuita)**
Caso prefira não usar infraestrutura própria, plataformas gratuitas resolvem perfeitamente:
- **GitHub Pages:** Vá nas configurações do seu repositório no GitHub, procure pela aba "Pages" e ative o deploy a partir da branch `main`.
- **Vercel / Netlify:** Vincule seu repositório do GitHub e clique em "Deploy". Em poucos segundos seu site estará no ar com um link público.

---

## 🔑 Acessos e Perfis

O sistema possui dois tipos de visão:
- **Administrador:** Tem acesso a painéis, indicadores, e edição completa do inventário.
- **Cliente (Colaborador):** Tem acesso apenas à "Área do Cliente", onde pode solicitar equipamentos, relatar problemas e ver seus próprios chamados.

**Como criar o primeiro administrador:**
1. Abra o site que você hospedou e crie uma conta na tela de Login/Cadastro.
2. Por padrão, toda conta nova nasce com o perfil `client`.
3. Para virar Administrador, acesse o painel do Supabase, vá na tabela `perfis` (Table Editor > perfis), encontre o seu usuário recém-criado e mude a coluna `role` de `client` para `admin`.
4. Atualize a página do sistema e você terá acesso total.

---

## 📂 Estrutura do Projeto

- `index.html` - Arquivo principal e estrutura de todas as telas (Modais, Sidebar, Tabelas).
- `/css/` - Estilização do sistema (dividido por páginas, layouts, componentes e variáveis globais de cor).
- `/js/` - Lógica do aplicativo:
  - `auth.js` - Gerenciamento de login, cadastro e controle de rotas.
  - `supabase.js` - Conexão e todas as funções que salvam/puxam dados do banco.
  - `csv.js` - Lógica de Importação e Exportação de planilhas.
  - `navigation.js` - Controle do menu lateral e mudança de telas.
  - `/views/` - Lógicas específicas de cada aba (ativos, colaboradores, solicitações, movimentações, etc).

---

## 🔄 Scripts de Migração
Na raiz do projeto existem alguns arquivos nomeados como `migration_...sql`. Eles foram usados para atualizar bancos de dados antigos. **Para novas instalações, você só precisa rodar o `schema.sql` principal**, pois ele já contém todas as atualizações mais recentes!
