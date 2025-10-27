# Configuração do Supabase Storage para Selfies

Este guia explica como configurar o bucket de storage para as selfies dos registros de ponto.

## Opção 1: Usando Supabase CLI (Recomendado)

Se você tem o Supabase CLI instalado:

```bash
# 1. Fazer link com o projeto (se ainda não fez)
supabase link --project-ref rxbnmitkcbgpkgdwlvyk

# 2. Aplicar todas as migrations (incluindo a nova do storage)
supabase db push
```

## Opção 2: Usando SQL Editor no Supabase Studio

1. Acesse o [Supabase Studio](https://supabase.com/dashboard/project/rxbnmitkcbgpkgdwlvyk)
2. Vá em **SQL Editor**
3. Execute o conteúdo do arquivo `supabase/migrations/20251027030000_create_selfies_storage.sql`

## Opção 3: Configuração Manual via Interface

### 1. Criar o Bucket

1. Acesse **Storage** no Supabase Studio
2. Clique em **Create bucket**
3. Nome: `selfies`
4. Marque **Public bucket** (para URLs públicas)
5. Clique em **Create bucket**

### 2. Configurar Políticas RLS

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