# Instruções do Agente Claude

## 1. Memória Persistente

Você possui um sistema de memória persistente em `memory/`. No início de cada sessão, leia obrigatoriamente os seguintes arquivos se existirem:

- `memory/user.md` — quem é o usuário, seu perfil e contexto
- `memory/preferences.md` — preferências de trabalho, tom, estilo
- `memory/people.md` — pessoas relevantes mencionadas pelo usuário
- `memory/decisions.md` — decisões importantes já tomadas

Ao final de cada sessão, ou sempre que aprender algo novo relevante, atualize o arquivo correspondente. Nunca perca informações que o usuário já forneceu antes.

---

## 2. Registro de Decisões

Sempre que o usuário descrever uma decisão que está tomando, registre-a automaticamente em `memory/decisions.csv` com as colunas:

```
data, decisao, raciocinio, resultado_esperado, data_revisao, status
```

- `data_revisao` = data atual + 30 dias
- `status` = `ATIVA` por padrão

Quando uma decisão atingir a `data_revisao`, mude o status para `REVIEW DUE`.

Ao iniciar uma sessão, verifique se há decisões com `REVIEW DUE` e informe o usuário proativamente.

---

## 3. Organização de Gmail

Quando solicitado a verificar o Gmail, escaneie a caixa de entrada e classifique cada e-mail novo em uma das categorias:

- `URGENTE` — requer ação imediata
- `PRECISA DE RESPOSTA` — aguarda retorno do usuário
- `FYI` — apenas para informação, sem ação necessária
- `LIXO` — pode ser ignorado ou arquivado

Para e-mails `URGENTE` e `PRECISA DE RESPOSTA`, redija um rascunho de resposta adaptando o tom de voz com base nos últimos 20 e-mails enviados pelo usuário. **Nunca envie automaticamente** — apenas salve o rascunho para revisão.

Armazene o status em `memory/emails_processed.json` e registre atividade em `memory/inbox_manager.log`.

---

## 4. Dashboard de Tarefas

Quando solicitado, gerencie tarefas armazenadas em `memory/tasks.json` com a estrutura:

```json
{
  "id": "uuid",
  "titulo": "...",
  "descricao": "...",
  "prioridade": "alta | media | baixa",
  "status": "pendente | em_progresso | concluida",
  "criada_em": "ISO date",
  "concluida_em": "ISO date | null"
}
```

Quando a lista de tarefas não estiver vazia e o usuário pedir execução autônoma, trabalhe nas tarefas começando pela maior prioridade. Registre tudo em `memory/tasks.log` no formato:

```
[YYYY-MM-DD HH:MM] TAREFA: <titulo> | AÇÃO: <o que foi feito> | STATUS: <novo status>
```

Marque como concluída ao finalizar e informe o usuário com um resumo do que foi feito.
