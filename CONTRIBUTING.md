# Contribuição e Convenção de Commits (Português)

Para manter o histórico do projeto organizado e fácil de entender, adotamos **Conventional Commits** em Português e fluxo de push direto na `main`.

## Convenção de Commits

Formato:

```
<tipo>(escopo opcional): descrição em português
```

Tipos mais usados:
- feat: adiciona nova funcionalidade
- fix: corrige bug
- refactor: refatora código sem alterar comportamento
- chore: tarefas de manutenção (deps, configs, scripts)
- docs: documentação
- style: formatação/estilo (sem lógica)
- test: testes automatizados
- perf: melhorias de performance
- build: mudanças que afetam build (dependências, bundler)
- ci: ajustes de CI/CD
- revert: reverte um commit anterior

### Exemplos
- `feat(painel): adiciona gráfico de produtividade`
- `fix(auth): corrige erro de login em dispositivos mobile`
- `docs(readme): atualiza instruções de execução`
- `chore(deps): atualiza tailwind para 3.4.x`
- `refactor(historico): simplifica cálculo de horas extras`
- `perf(graficos): melhora desempenho na renderização`

## Escopos sugeridos para este projeto
- auth, painel, historico, equipe, relatorios, graficos, componentes, paginas, hooks, supabase, migrations, integrações, ui, estilos

Use o escopo que melhor descreve a área impactada (ex.: `feat(hooks): adiciona useUserRole`).

## Mensagens em Português
As descrições devem ser claras e objetivas, sempre em Português.

## Fluxo de Push
- O projeto utiliza **push direto na `main`** para agilidade.
- Após cada melhoria aprovada, executar:
  - `git add -A`
  - `git commit -m "<mensagem seguindo convenção>"`
  - `git push origin main`

## Boas práticas
- Commits pequenos e focados.
- Descrever o "porquê" quando necessário no corpo do commit (opcional).
- Referenciar tarefas/issues quando aplicável.

## Opcional: validação de mensagens
Se desejado, podemos configurar **commitlint + Husky** para validar automaticamente o padrão das mensagens.