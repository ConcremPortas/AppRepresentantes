1- Seu claude nunca mais vai se esquecer



Crie um sistema de memória persistente para você. Crie um diretório /memory com arquivos organizados por categoria: decisions. md (decisões), people.md (pessoas), preferences.md (preferências) e user.md (usuário).

Escreva um arquivo CLAUDE.md que te instrua a ler esses arquivos no início de cada sessão e a atualizá-los ao final.



2- Mantenha a responsabilidade sobre suas decisões



Crie um sistema de registro de decisões. Sempre que eu descrever uma decisão que estou tomando, registre-a em decisions.csv com: data, decisão, raciocínio, resultado esperado e uma data de revisão para daqui a 30 dias.

Configure um cron job que verifique diariamente se alguma decisão atingiu a data de revisão e adicione a etiqueta "REVIEW DUE" (Revisão

Pendente). Crie um script review.sh que exiba apenas esses itens etiquetados.



3- Limpe sua caixa de entrada



Crie um cron job de hora em hora que escaneie minha caixa de entrada do Gmail e organize os novos e-mails em: URGENTE / PRECISA DE RESPOSTA / APENAS PARA INFORMAÇÃO (FYI) / LIXO. Use etiquetas automáticas baseadas no meu histórico.

Salve rascunhos de resposta para os e-mails URGENTES e que

PRECISAM DE RESPOSTA - adaptando o tom de voz aos meus últimos 20 e-mails enviados. Nunca envie automaticamente. Armazene o status em emails\_processed.json e registre o log em inbox\_manager.log.



4- Delegue a execução



Construa um dashboard de tarefas com uma interface web local. Eu devo conseguir adicionar, editar e excluir tarefas com níveis de prioridade.

Configure um cron job de hora em hora — se a lista de tarefas não estiver vazia, trabalhe nelas de forma autônoma, começando pela maior prioridade. Registre o que foi feito e marque como concluída. Armazene as tarefas em tasks.jsone registre toda a atividade em tasks.log.

