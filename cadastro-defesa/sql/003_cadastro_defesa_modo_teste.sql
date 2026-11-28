begin;

create or replace function public.gd_gravar(p_acao text, p_id text, p_dados jsonb, p_ator text) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
    auto public.auto_infracao%rowtype;
    defesa public.defesa%rowtype;
    auto_id public.auto_infracao.id_auto%type;
    defesa_id public.defesa.id_defesa%type;
    protocolo date;
    prazo date;
    fora boolean;
    arquivo bytea;
    nome_arquivo text;
begin
    if p_acao = 'cadastrar' then
        select a.id_auto into auto_id from public.auto_infracao a where a.id_auto::text = p_dados->>'id_auto';
        if not found then raise sqlstate 'PT404' using message = 'Auto de infração não encontrado.'; end if;
    elsif p_acao in ('editar', 'ativar', 'inativar') then
        select d.fk_auto_infracao_id_auto, d.id_defesa into auto_id, defesa_id from public.defesa d where d.id_defesa::text = p_id;
        if not found then raise sqlstate 'PT404' using message = 'Defesa não encontrada.'; end if;
    else
        raise sqlstate 'PT400' using message = 'Operação inválida.';
    end if;

    -- A mesma linha do auto serializa cadastros, alterações e exclusões.
    select a.* into auto from public.auto_infracao a where a.id_auto = auto_id for update;
    if not found then raise sqlstate 'PT404' using message = 'Auto de infração não encontrado.'; end if;

    if p_acao in ('editar', 'ativar', 'inativar') then
        select d.* into defesa from public.defesa d
        where d.id_defesa = defesa_id and d.fk_auto_infracao_id_auto = auto_id for update;
        if not found then raise sqlstate 'PT404' using message = 'Defesa não encontrada.'; end if;
    end if;

    if exists (select 1 from public.parecer p where p.fk_auto_infracao_id_auto = auto_id)
       or lower(auto.status_processo::text) in ('deferido', 'indeferido', 'julgado') then
        raise sqlstate 'PT409' using message = case p_acao
            when 'cadastrar' then 'Erro: Não é possível registrar defesa para um processo já julgado.'
            when 'editar' then 'Erro: Não é possível editar defesas de processos que já possuem parecer emitido.'
            else 'Erro: Não é possível alterar a situação de defesas de processos que já possuem parecer emitido.' end;
    end if;

    if p_acao = 'cadastrar' then
        if exists (select 1 from public.defesa d where d.fk_auto_infracao_id_auto = auto_id) then
            raise sqlstate 'PT409' using message = 'O auto já possui uma defesa registrada.';
        end if;
        if auto.status_processo is distinct from 'Aguardando Defesa'
           and (p_dados->'ignorar_status_para_teste') is distinct from 'true'::jsonb then
            raise sqlstate 'PT409' using message = 'O auto deve estar Aguardando Defesa para registrar uma defesa.';
        end if;
    elsif p_acao in ('ativar', 'inativar') and defesa.ativa = (p_acao = 'ativar') then
        return null;
    elsif p_acao = 'ativar' then
        if auto.status_processo is distinct from 'Aguardando Defesa'
           and auto.status_processo is distinct from 'Em Análise' then
            raise sqlstate 'PT409' using message = 'O auto deve estar Aguardando Defesa ou Em Análise para reativar o registro.';
        end if;
    elsif auto.status_processo is distinct from 'Em Análise' then
        raise sqlstate 'PT409' using message = 'O auto vinculado deve estar Em Análise.';
    end if;

    if p_acao in ('ativar', 'inativar') then
        update public.defesa set ativa = (p_acao = 'ativar') where id_defesa = defesa_id;
        if p_acao = 'ativar' then
            update public.auto_infracao set status_processo = 'Em Análise', prazo_cobranca_suspenso = true
            where id_auto = auto_id;
        elsif not exists (
            select 1 from public.defesa d where d.fk_auto_infracao_id_auto = auto_id and d.ativa
        ) then
            update public.auto_infracao set status_processo = 'Aguardando Defesa', prazo_cobranca_suspenso = false
            where id_auto = auto_id;
        end if;
        insert into public.historico_defesa (id_defesa, id_auto, acao, ator)
        values (defesa_id::text, auto_id::text, p_acao, p_ator);
        return null;
    end if;

    if p_acao = 'editar' and not defesa.ativa then
        raise sqlstate 'PT409' using message = 'Ative a defesa antes de editar.';
    end if;

    protocolo := coalesce((p_dados->>'data_envio')::date, defesa.data_envio::date);
    prazo := coalesce(auto.prazo_defesa_ate, auto.data_auto::date + 10);
    fora := defesa.fora_prazo;
    if p_acao = 'cadastrar' or protocolo is distinct from defesa.data_envio::date then
        if prazo is null then raise sqlstate 'PT409' using message = 'O auto não possui data para calcular o prazo da defesa.'; end if;
        fora := protocolo > prazo;
        if fora and (p_dados->>'confirmar_fora_prazo')::boolean is distinct from true then
            raise sqlstate 'PT409' using
                message = 'Atenção: O prazo legal para este auto expirou. Deseja registrar mesmo assim?',
                detail = 'DEFESA_FORA_PRAZO';
        end if;
    end if;

    arquivo := coalesce(decode(p_dados->'documento'->>'conteudo_base64', 'base64'), defesa.documento_conteudo);
    nome_arquivo := coalesce(p_dados->'documento'->>'nome', defesa.documento_nome);
    if protocolo is null or (
        nullif(btrim(defesa.url_defesa), '') is null and
        (coalesce(octet_length(arquivo), 0) = 0 or coalesce(nome_arquivo, '') = '')
    ) then
        raise sqlstate 'PT400' using message = 'Erro: Preencha todos os campos obrigatórios para continuar.';
    end if;

    if p_acao = 'cadastrar' then
        insert into public.defesa (
            id_defesa, fk_auto_infracao_id_auto, data_envio, observacoes,
            documento_nome, documento_conteudo, fora_prazo
        )
        values (
            gen_random_uuid()::text, auto_id, protocolo, p_dados->>'observacoes',
            nome_arquivo, arquivo, fora
        )
        returning id_defesa into defesa_id;
        update public.auto_infracao set status_processo = 'Em Análise', prazo_cobranca_suspenso = true
        where id_auto = auto_id;
    else
        update public.defesa set
            data_envio = case when p_dados ? 'data_envio' then protocolo else data_envio end,
            observacoes = case when p_dados ? 'observacoes' then p_dados->>'observacoes' else observacoes end,
            url_defesa = case when p_dados ? 'documento' then null else url_defesa end,
            documento_nome = nome_arquivo,
            documento_conteudo = arquivo,
            fora_prazo = fora
        where id_defesa = defesa_id;
    end if;

    return public.gd_consultar(defesa_id::text, false);
end;
$$;

revoke execute on function public.gd_gravar(text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.gd_gravar(text, text, jsonb, text) to service_role;

notify pgrst, 'reload schema';
commit;
