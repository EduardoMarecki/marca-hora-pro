# Configuração do Supabase Storage (Selfies e Documentos)

Este guia explica como configurar os buckets de storage para as selfies dos registros de ponto e para os documentos dos colaboradores.

## Opção 1: Usando Supabase CLI (Recomendado)

Se você tem o Supabase CLI instalado:

```bash
# 1. Fazer link com o projeto (se ainda não fez)
supabase link --project-ref rxbnmitkcbgpkgdwlvyk

# 2. Aplicar todas as migrations (incluindo as do storage)
supabase db push
```

## Opção 2: Usando SQL Editor no Supabase Studio

1. Acesse o [Supabase Studio](https://supabase.com/dashboard/project/rxbnmitkcbgpkgdwlvyk)
2. Vá em **SQL Editor**
3. Execute o conteúdo dos arquivos abaixo conforme necessário:
   - `supabase/migrations/20251027030000_create_selfies_storage.sql` (cria bucket `selfies`)
   - `supabase/migrations/20251027040000_secure_selfies_private.sql` (torna o bucket `selfies` privado)
   - `supabase/migrations/20251028090000_create_documentos_storage.sql` (cria bucket `documentos` e políticas)

## Opção 3: Configuração Manual via Interface

### 1. Criar o Bucket de Selfies

1. Acesse **Storage** no Supabase Studio
2. Clique em **Create bucket**
3. Nome: `selfies`
4. Marque **Public bucket** (para URLs públicas)
5. Clique em **Create bucket**

### 2. Configurar Políticas RLS para Selfies

Vá em **Storage** > **Policies** e adicione as seguintes políticas:

#### Política de Upload (INSERT)
```sql
CREATE POLICY "Users can upload selfies to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'selfies' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Política de Visualização Própria (SELECT)
```sql
CREATE POLICY "Users can view own selfies"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'selfies' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Política de Leitura Pública (SELECT)
```sql
CREATE POLICY "Public read access to selfies"
ON storage.objects FOR SELECT
USING (bucket_id = 'selfies');
```

#### Política de Exclusão (DELETE)
```sql
CREATE POLICY "Users can delete own selfies"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'selfies' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Estrutura de Arquivos

As selfies são organizadas da seguinte forma:
```
selfies/
├── {user_id_1}/
│   ├── 1730123456789.jpg
│   ├── 1730123567890.png
│   └── ...
├── {user_id_2}/
│   ├── 1730123678901.jpg
│   └── ...
└── ...
```

## Segurança

- **Upload**: Usuários só podem fazer upload em suas próprias pastas
- **Leitura**: URLs públicas para facilitar exibição (pode ser alterado para URLs assinadas)
- **Exclusão**: Usuários só podem deletar suas próprias selfies

## Testando

Após a configuração:

1. Acesse o sistema local: http://localhost:8081/
2. Vá em **Perfil** e ative **Exigir selfie ao bater ponto**
3. Tente registrar um ponto - deve solicitar uma selfie
4. Verifique se a selfie aparece no histórico

## Alternativa: URLs Assinadas (Mais Seguro)

Se preferir URLs privadas com tempo de expiração, remova a política "Public read access" e modifique o código para usar `createSignedUrl()` em vez de `getPublicUrl()`.

---

## Documentos dos Colaboradores (Bucket `documentos`)

Os arquivos de documentos (RG, CPF, contrato, etc.) são enviados para um bucket privado chamado `documentos`. Cada colaborador possui uma pasta identificada por seu `profile_id`.

### Criação via SQL (recomendado)

Execute a migration `supabase/migrations/20251028090000_create_documentos_storage.sql`. Ela:
- Garante que o bucket `documentos` existe e é privado
- Cria políticas:
  - Upload: próprio usuário ou admin podem enviar
  - Select: próprio usuário pode ver; admin pode ver tudo
  - Delete: próprio usuário ou admin podem excluir

### Criação Manual via Interface

1. Acesse **Storage** > **Create bucket**
2. Nome: `documentos`
3. Desmarque "Public bucket" (bucket privado)
4. Crie políticas em **Storage > Policies** equivalentes às da migration:
   - INSERT: `bucket_id = 'documentos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))`
   - SELECT (próprio): `bucket_id = 'documentos' AND auth.uid()::text = (storage.foldername(name))[1]`
   - SELECT (admin): `bucket_id = 'documentos' AND public.has_role(auth.uid(), 'admin')`
   - DELETE: `bucket_id = 'documentos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))`

### Estrutura de Pastas

```
documentos/
├── {profile_id}/
│   ├── 1730123456789_RG.pdf
│   ├── 1730123567890_contrato.pdf
│   └── ...
└── ...
```

### Observações

- O upload na aba "Documentos" do Perfil Detalhado usa a pasta `{selectedProfile.id}/...`. Por isso, é necessário permitir admins enviarem para outras pastas.
- Como o bucket é privado, a listagem/visualização futura deve usar políticas adequadas (já incluídas) e, se expor via URL, preferir URLs assinadas.

### Teste Rápido

1. Aplique a migration ou crie o bucket/políticas manualmente
2. Abra o app: http://localhost:8081/
3. Vá em Equipe > Perfil Detalhado > Documentos
4. Faça upload de um arquivo
5. Verifique no Supabase Studio em Storage > documentos > pasta do colaborador