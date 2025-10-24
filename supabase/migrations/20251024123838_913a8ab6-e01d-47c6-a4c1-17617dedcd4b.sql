-- Adicionar campos específicos de horários na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS horario_entrada time DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS horario_saida_almoco time DEFAULT '12:00:00',
ADD COLUMN IF NOT EXISTS horario_volta_almoco time DEFAULT '13:00:00',
ADD COLUMN IF NOT EXISTS horario_saida_final time DEFAULT '17:00:00';