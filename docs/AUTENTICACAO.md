# Autenticação (login e senha)

O app exige login. Quem entra vê o repertório; só o **administrador** cria
contas.

---

## 1. Como funciona

```
Navegador                          Servidor (Next.js)              Firebase
     │                                   │                           │
     │  1. POST /api/sessao ───────────►│                           │
     │     { email, senha }              │ 2. valida a senha no ────►│
     │                                   │    Identity Toolkit ──────►│
     │  ◄── session cookie (httpOnly) ───┤ 3. cria o cookie ─────────┤
     │                                   │                           │
     │  4. navega: toda requisição leva o cookie
     │                                   │ verifySessionCookie()
     │                                   │ ────────────────────────► Firestore
```

**O login acontece no servidor** (Identity Toolkit admin), com o token da
Service Account. Isso significa que **a `apiKey` do Web SDK não é necessária**
para entrar no app — e que o navegador nunca vê a senha.

Pontos importantes:

- **O cookie é httpOnly**: o JavaScript da página não consegue lê-lo, então
  um XSS não consegue roubar a sessão.
- **A senha vai do navegador para o nosso servidor e dele para o Firebase** —
  o servidor valida e devolve apenas um **ID token**, que vira o cookie de
  sessão. A senha nunca é gravada aqui.
- **A session cookie dura 5 dias** e é revogável (`verifySessionCookie(..., true)`
  checa revogação a cada uso).
- **O Firestore continua `deny all` para o cliente**: mesmo com o SDK Web no
  navegador, não dá para ler as músicas direto do banco.

---

## 2. Papéis

| Papel | Quem é | O que pode |
| --- | --- | --- |
| **Administrador** | o **primeiro** usuário do projeto | tudo + criar/excluir contas |
| **Usuário** | os demais | ver, tocar e manter as músicas |

O primeiro usuário é detectado automaticamente (`ehPrimeiroUsuario`): enquanto
não existir **nenhum** usuário no projeto, a aba "Criar conta" fica aberta na
tela de login. Depois disso, o cadastro fecha e só o admin cria contas.

Para fixar administradores explicitamente, defina `ADMIN_EMAILS` no `.env.local`:

```
ADMIN_EMAILS=ivan@email.com,maria@email.com
```

---

## 3. Passo a passo no console do Firebase

### 3.1 Ligar o Authentication

1. Menu lateral → **Segurança** → **Authentication**
   (link direto: `https://console.firebase.google.com/project/<PROJECT_ID>/authentication/providers`)
2. **Começar** (Get started)
3. Aba **"Método de login"** → **E-mail/Senha** → **Habilitar** → **Salvar**

> Sem isso o projeto responde `CONFIGURATION_NOT_FOUND` e nenhuma conta pode ser
> criada. Diagnóstico rápido:
>
> ```bash
> npm run criar:usuario -- --status
> ```

### 3.2 (Opcional) Configuração do Web SDK

**Não é necessária para o login funcionar** — o login é feito pelo servidor.
Só vale a pena para recursos que dependem do SDK no navegador (recuperação de
senha por e-mail, verificação de e-mail, login social no futuro).

1. **Configurações do projeto** (⚙️) → **Seus apps** (Your apps)
2. Ícone **Web (`</>`)** → apelido "Pasta de Músicas" → **Registrar aplicativo**
3. Copie o objeto `firebaseConfig` e grave no `.env.local`:

```bash
node scripts/configurar-web.mjs      # cole o JSON e pressione Ctrl+D
```

### 3.3 (Opcional) Autorizar um domínio na Vercel

Em **Authentication → Settings → Authorized domains**, adicione o domínio da
Vercel (`pasta-de-musicas.vercel.app`). Como o login é feito **no servidor**
(Identity Toolkit via Service Account), a lista de domínios autorizados não é
obrigatória — ela só é necessária se algum dia o Web SDK for usado no navegador.
Hoje o único efeito prático é liberar o domínio para futuras integrações.

---

## 4. O que tem no código

| Arquivo | Papel |
| --- | --- |
| `src/lib/firebase/contas.ts` | criar conta, autenticar, listar e apagar (Identity Toolkit admin) |
| `src/lib/firebase/token.ts` / `contas.ts` | token OAuth da Service Account (JWT RS256) |
| `src/lib/firebase/client.ts` | Web SDK — **opcional** (só para recursos de navegador) |
| `src/lib/sessao.ts` | session cookie, papéis, `exigirUsuario()` / `exigirSessaoApi()` |
| `src/proxy.ts` | redireciona para `/entrar` quando não há cookie |
| `src/app/entrar/page.tsx` | tela de login e cadastro |
| `src/app/api/sessao/route.ts` | troca ID token por cookie · logout |
| `src/app/api/sessao/registro/route.ts` | cria a primeira conta |
| `src/app/api/sessao/usuario/route.ts` | dados do usuário da sessão |
| `src/app/api/usuarios/route.ts` | lista/cria/exclui contas (admin) |
| `src/components/auth/provedor-auth.tsx` | estado do usuário no navegador |
| `src/components/manutencao/painel-usuarios.tsx` | painel de contas (admin, exibido em Ajuda) |

---

## 5. Regras de segurança

- Toda API de dados exige sessão (`exigirSessaoApi()`) → sem cookie, **401**.
- Toda página exige sessão (`exigirUsuario()`) → sem sessão, vai para `/entrar`.
- O painel de usuários só aparece e só age para administradores.
- Um administrador não consegue excluir a própria conta.
- As senhas são geradas/definidas pelo Firebase Auth — nunca armazenamos.

---

## 6. Criar a conta do primeiro usuário

**Opção A — pela tela (recomendado):**

1. Rode o app (`npm run dev`) e abra `http://localhost:3000/entrar`
2. Na aba **"Criar conta"**, cadastre e-mail, nome e senha (mínimo 6)
3. Esse usuário vira o administrador
4. Vá em **Ajuda → Administração → Usuários → Gerenciar** para criar as
   demais contas (a seção só aparece para o administrador)

**Opção B — pelo terminal:**

```bash
npm run criar:usuario -- --email=ivan@email.com --senha="sua-senha" --nome="Ivan"
npm run criar:usuario -- --status      # diagnóstico do projeto
```

O script usa o endpoint administrativo do Identity Toolkit e também serve para
**redefinir a senha** de quem já existe.

> ⚠️ Detalhe do console novo: o endpoint `accounts:batchGet` devolve **404**
> (só `accounts:query` funciona) — foi por isso que o diagnóstico dava falso
> negativo.
