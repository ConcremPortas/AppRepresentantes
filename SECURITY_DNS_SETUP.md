# Configuração de DNS e E-mail — Concrem Connect

Este documento explica por que os apontamentos **SPF, DMARC, DKIM e DNSSEC** do
relatório do Nexus Scanner **não podem ser corrigidos no código da aplicação** e
descreve o que precisa ser feito no **DNS do domínio** (fora do repositório).

> **Resumo:** SPF/DMARC/DKIM/DNSSEC são registros de DNS do *domínio*. O app está
> hoje em `representativesap.vercel.app`, um subdomínio da Vercel — **não temos
> controle sobre o DNS de `vercel.app`**, portanto esses registros não podem ser
> criados enquanto o app usar esse endereço.

---

## 1. Por que não dá para corrigir agora

- `SPF`, `DMARC` e `DKIM` só fazem sentido para **domínios que enviam e-mail** e
  são publicados como registros `TXT`/`CNAME` na zona DNS **daquele domínio**.
- `DNSSEC` é ativado no **registrador/provedor de DNS** do domínio.
- O domínio `vercel.app` pertence à Vercel. Não podemos publicar registros nele.
- O Concrem Connect, por si só, **não envia e-mails** (a autenticação e os
  e-mails transacionais, quando houver, saem pela infraestrutura do Supabase /
  provedor de e-mail corporativo, não pelo domínio do app).

**Conclusão:** esses 4 pontos são "não aplicáveis" enquanto o app estiver em
`*.vercel.app`. A correção definitiva é **usar um domínio próprio**.

---

## 2. Recomendação: domínio próprio

Apontar o app para um subdomínio da Concrem, por exemplo:

- `connect.concrem.com.br`
- `portal.concrem.com.br`
- `app.concrem.com.br`

### Passos na Vercel
1. Projeto → **Settings → Domains → Add** → informar o subdomínio escolhido.
2. A Vercel mostrará um registro `CNAME` (ou `A`) para criar no DNS da Concrem.
3. Criar esse registro no provedor DNS de `concrem.com.br`.
4. Aguardar a validação e o certificado TLS automático da Vercel.

Depois disso, os registros de e-mail/segurança abaixo passam a ser possíveis,
pois estarão na zona de `concrem.com.br` (que a Concrem controla).

---

## 3. Registros de DNS a configurar (na zona de `concrem.com.br`)

> Ajuste os valores conforme o **provedor de e-mail real** da Concrem
> (Google Workspace, Microsoft 365 etc.). Os exemplos abaixo assumem Google Workspace.

### 3.1 SPF (autoriza quem pode enviar e-mail pelo domínio)
Registro **TXT** no domínio de envio (ex.: `concrem.com.br`):

```
Tipo:  TXT
Nome:  @        (ou concrem.com.br.)
Valor: v=spf1 include:_spf.google.com ~all
```

- Se usar Microsoft 365: `v=spf1 include:spf.protection.outlook.com ~all`
- **Um único** registro SPF por domínio. Se já existir, **combine os includes**
  em vez de criar um segundo.

### 3.2 DMARC (política de tratamento de e-mails que falham SPF/DKIM)
Registro **TXT** em `_dmarc`:

**Fase inicial (monitorar, sem impacto na entrega):**
```
Tipo:  TXT
Nome:  _dmarc
Valor: v=DMARC1; p=none; rua=mailto:dmarc@concrem.com.br
```

**Após validar os relatórios (endurecer):**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@concrem.com.br; pct=100; adkim=s; aspf=s
```

**Estágio final (mais restritivo, opcional):**
```
v=DMARC1; p=reject; rua=mailto:dmarc@concrem.com.br
```

> Suba de `p=none` → `p=quarantine` → `p=reject` gradualmente, acompanhando os
> relatórios `rua` para não bloquear e-mails legítimos.

### 3.3 DKIM (assinatura criptográfica dos e-mails)
Configurado **no provedor de e-mail**, que gera a chave e o registro a publicar:

- **Google Workspace:** Admin Console → *Apps → Google Workspace → Gmail →
  Autenticar e-mail* → gerar chave DKIM → publicar o `TXT` fornecido
  (normalmente em `google._domainkey`).
- **Microsoft 365:** *Defender → Políticas → DKIM* → habilitar o domínio →
  publicar os **dois CNAMEs** (`selector1._domainkey`, `selector2._domainkey`).

### 3.4 DNSSEC (integridade das respostas de DNS)
Ativado no **registrador / provedor de DNS** do domínio:

- **Registro.br:** painel do domínio → *DNSSEC* → habilitar (gera o registro DS).
- **Cloudflare (se o DNS estiver lá):** *DNS → Settings → DNSSEC → Enable* →
  copiar o registro **DS** e cadastrá-lo no registrador (Registro.br).

---

## 4. Checklist

- [ ] Adicionar domínio próprio (`connect.concrem.com.br`) na Vercel
- [ ] Criar o CNAME/A da Vercel no DNS da Concrem
- [ ] Publicar **SPF** (TXT) no domínio de envio
- [ ] Publicar **DMARC** em `_dmarc` começando com `p=none`
- [ ] Habilitar **DKIM** no provedor de e-mail e publicar o registro gerado
- [ ] Ativar **DNSSEC** no registrador (Registro.br) / provedor de DNS
- [ ] Após ~48h de propagação, rodar o scanner novamente

---

## 5. Como validar

- **SPF/DMARC/DKIM:** https://mxtoolbox.com (buscas `spf:`, `dmarc:`, `dkim:`) ou
  `https://dmarcian.com/dmarc-inspector/`.
- **DNSSEC:** https://dnssec-analyzer.verisignlabs.com/ ou `https://dnsviz.net/`.
- Linha de comando:
  ```bash
  dig TXT concrem.com.br +short           # SPF
  dig TXT _dmarc.concrem.com.br +short    # DMARC
  dig DS  concrem.com.br +short           # DNSSEC (registro DS)
  ```

> **Observação:** nada disso é feito no código do app. É configuração de
> infraestrutura (DNS + provedor de e-mail) e deve ser executada pela equipe que
> administra o domínio `concrem.com.br`.
