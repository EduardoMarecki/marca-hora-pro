# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog (https://keepachangelog.com/en/1.1.0/) and this project adheres to Semantic Versioning.

## [v0.8.0] - 2025-10-29

### Added
- Histórico: paginação server-side e exportação filtrada (CSV e PDF).
- Exportação PDF: layout padronizado em tabela (cabeçalho, colunas com larguras fixas, bordas, quebra de texto e quebra automática de página).
- PDF: fonte dinâmica nas linhas (10pt, 9pt, 8pt) baseada na densidade para melhorar legibilidade de textos longos.
- PDF: título “Histórico de Registros” (com período quando filtrado) e rodapé em todas as páginas com “Página X de N” + data/hora de geração.
- UI: responsividade da tabela e dos botões em dispositivos mobile (overflow-x no container da tabela, largura mínima e botões empilhados no mobile).
- UI: truncamento com ellipsis para e-mail e localização, com tooltip via atributo `title` para preservar acesso ao conteúdo completo.

### Changed
- Compatibilidade: manutenção dos rótulos e tipos antigos de pausa via `getTipoLabel`, para preservar históricos anteriores.

### Fixed
- Evitar quebra de layout por textos longos (e-mail/localização) em telas pequenas.

### Notes
- Caso seja necessário, ajustar larguras de coluna da tabela conforme densidade dos dados e preferências de leitura.
- Próximas melhorias sugeridas: seletor de `pageSize`, busca/ordenação server-side, exportação Excel, índices no Supabase e testes adicionais de responsividade.

---

## [v0.7.0] - 2025-10-20
### Added
- Base de histórico com filtros por data, tipo e usuário (admin), e resumo de contagens no período.
- Integração com Supabase para listagem paginada.

### Notes
- Esta versão serviu de base para as melhorias consolidadas em v0.8.0.

---

## [v0.6.0] - 2025-10-10
### Added
- Estrutura inicial do projeto (React + Vite + shadcn/ui) e autenticação via Supabase.

---

## [Unreleased]
- Em preparo: seleção de tamanho da página, ordenação e busca avançadas no servidor, exportação Excel, criação de VIEW otimizada no banco e RLS endurecida.