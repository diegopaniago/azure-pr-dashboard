# Backlog Técnico

Esta lista registra melhorias úteis, mas não obrigatórias para o MVP atual. Antes de implementar, valide se o ganho compensa a complexidade.

## Alta Prioridade

- Reduzir custo de leitura de threads, consultando comentários apenas quando a PR ainda não for relevante por reviewer direto ou grupo.
- Adicionar testes para casos reais de reviewer por grupo retornados pela organização.
- Melhorar mensagens de erro por tipo: configuração ausente, autenticação inválida, permissão insuficiente e rate limit.

## Média Prioridade

- Adicionar endpoint opcional para detalhes de uma PR.
- Persistir cache em arquivo local para sobreviver a restart do container.
- Adicionar opção de ordenar tabela por data, status e repositório.
- Criar filtro "Precisa da minha revisão" baseado em `reviewerVote`.

## Baixa Prioridade

- Exportar lista filtrada em CSV.
- Adicionar tema escuro.
- Mostrar histórico local de mudanças detectadas.
- Criar modo diagnóstico para listar quantas chamadas foram feitas à API.

## Não Fazer por Enquanto

- Não migrar para framework frontend.
- Não adicionar banco de dados.
- Não criar autenticação local.
- Não expor PAT ou chamadas diretas ao Azure DevOps no navegador.

