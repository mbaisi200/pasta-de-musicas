# Autenticação (login e senha)

O app exige login. Quem entra vê o repertório; só o **administrador** cria
contas.

---

## 1. Como funciona

```
Navegador                          Servidor (Next.js)              Firebase
     │                                   │                           │
     │  1. login (e-mail + senha) ──────►│                           │
     │     via Firebase Web SDK ─────────────────────────────────────► │
     │                                   │                           │
     │  ◄── ID token ─────────────────────────────────────────────────┘
     │
     │  2. POST /api/sessao { idToken } ─►│
     │                                   │ valida o token
     │  ◄── session cookie (httpOnly) ───┤
     │
     │  3. navega: toda requisição leva o cookie
     │                                   │ verifySessionCookie()
     │                                   │ ────────────────────────► Firestore
```

Pontos importantes:

- **O cookie é httpOnly**: o JavaScript da página não consegue lê-lo, então
  um XSS não consegue roubar a sessão.
- **A senha nunca passa pelo nosso servidor**: ela vai direto do navegador
  para o Firebase Auth. O servidor só vê tokens.
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

1. Menu lateral → **Authentication** (ou "Autenticação")
2. **Começar** (Get started)
3. Aba **"Sign-in method"** (Método de login) → **E-mail/Senha** (Email/Password)
4. **Habilitar** (Enable) → **Salvar**

### 3.2 Pegar a configuração do Web SDK

1. **Configurações do projeto** (⚙️) → **Seus apps** (Your apps)
2. Ícone **Web (`</>`)** → apelido "Pasta de Músicas" → **Registrar aplicativo**
3. Copie o objeto `firebaseConfig`:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "pasta-de-musicas-ivan.firebaseapp.com",
  projectId: "pasta-de-musicas-ivan",
  storageBucket: "pasta-de-musicas-ivan.firebasestorage.app",
  messagingSenderId: "110623...",
  appId: "1:110623...:web:abc..."
};
```

4. Grave no `.env.local` (o script faz isso):

```bash
node scripts/configurar-web.mjs      # cole o JSON e pressione Ctrl+D
```

### 3.3 (Opcional) Autorizar um domínio na Vercel

Em **Authentication → Settings → Authorized domains**, adicione o domínio da
Vercel (ex.: `pasta-de-musicas.vercel.app`). Sem isso, o login funciona em
localhost mas pode ser bloqueado no domínio publicado.

---

## 4. O que tem no código

| Arquivo | Papel |
| --- | --- |
| `src/lib/firebase/client.ts` | Web SDK (só login) |
| `src/lib/sessao.ts` | session cookie, papéis, `exigirUsuario()` / `exigirSessaoApi()` |
| `src/proxy.ts` | redireciona para `/entrar` quando não há cookie |
| `src/app/entrar/page.tsx` | tela de login e cadastro |
| `src/app/api/sessao/route.ts` | troca ID token por cookie · logout |
| `src/app/api/sessao/registro/route.ts` | cria a primeira conta |
| `src/app/api/sessao/usuario/route.ts` | dados do usuário da sessão |
| `src/app/api/usuarios/route.ts` | lista/cria/exclui contas (admin) |
| `src/components/auth/provedor-auth.tsx` | estado do usuário no navegador |
| `src/components/manutencao/painel-usuarios.tsx` | painel de contas (admin) |

---

## 5. Regras de segurança

- Toda API de dados exige sessão (`exigirSessaoApi()`) → sem cookie, **401**.
- Toda página exige sessão (`exigirUsuario()`) → sem sessão, vai para `/entrar`.
- O painel de usuários só aparece e só age para administradores.
- Um administrador não consegue excluir a própria conta.
- As senhas são geradas/definidas pelo Firebase Auth — nunca armazenamos.

---

## 6. Criar a conta do primeiro usuário

1. Rode o app (`npm run dev`) e abra `http://localhost:3000/entrar`
2. Na aba **"Criar conta"**, cadastre e-mail, nome e senha (mínimo 6)
3. Esse usuário vira o administrador
4. Vá em **Manutenção → Usuários → Gerenciar** para criar as demais contas
