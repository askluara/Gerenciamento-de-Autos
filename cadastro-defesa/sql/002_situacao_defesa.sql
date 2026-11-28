begin;

alter table public.defesa add column if not exists ativa boolean not null default true;

alter table public.historico_defesa
    drop constraint if exists historico_defesa_acao_check,
    add constraint historico_defesa_acao_check check (acao in ('excluir', 'ativar', 'inativar'));

create or replace function public.gd_pesquisar(
    p_apenas_autos boolean, p_numero text, p_documento text, p_nome text,
    p_inicio date, p_fim date, p_pagina integer
) returns jsonb
language sql stable security invoker set search_path = ''
as $$
    select coalesce(jsonb_agg(resultado order by data_ordem desc nulls last, id_ordem), '[]'::jsonb)
    from (
        select
            case when p_apenas_autos then dados_auto else
                jsonb_build_object(
                    'id_defesa', d.id_defesa, 'id_auto', d.fk_auto_infracao_id_auto, 'data_envio', d.data_envio,
                    'observacoes', d.observacoes, 'documento_nome', d.documento_nome,
                    'fora_prazo', d.fora_prazo, 'ativa', d.ativa, 'url_defesa', d.url_defesa, 'auto', dados_auto
                )
            end as resultado,
            case when p_apenas_autos then a.data_auto::date else d.data_envio::date end as data_ordem,
            case when p_apenas_autos then a.id_auto::text else d.id_defesa::text end as id_ordem
        from public.auto_infracao a
        left join public.contribuinte c on c.id_contribuinte = a.fk_contribuinte_id_contribuinte
        left join public.defesa d on not p_apenas_autos and d.fk_auto_infracao_id_auto = a.id_auto
        cross join lateral (
            select jsonb_build_object(
                'id_auto', a.id_auto, 'numero_auto', a.numero_auto, 'data_auto', a.data_auto,
                'status_processo', a.status_processo,
                'prazo_defesa_ate', coalesce(a.prazo_defesa_ate, a.data_auto::date + 10),
                'prazo_cobranca_suspenso', a.prazo_cobranca_suspenso,
                'possui_defesa', exists (select 1 from public.defesa vinculada where vinculada.fk_auto_infracao_id_auto = a.id_auto),
                'possui_parecer', exists (select 1 from public.parecer p where p.fk_auto_infracao_id_auto = a.id_auto),
                'contribuinte', jsonb_build_object('nome', c.nome, 'cpf', c.cpf, 'cnpj', c.cnpj)
            ) as dados_auto
        ) dados
        where (p_apenas_autos or d.id_defesa is not null)
          and (p_numero is null or a.numero_auto::text = p_numero)
          and (p_documento is null or p_documento in (
              regexp_replace(c.cpf::text, '[^0-9]', '', 'g'),
              regexp_replace(c.cnpj::text, '[^0-9]', '', 'g')
          ))
          and (p_nome is null or strpos(lower(c.nome), lower(p_nome)) > 0)
          and (p_inicio is null or d.data_envio::date >= p_inicio)
          and (p_fim is null or d.data_envio::date <= p_fim)
        order by data_ordem desc nulls last, id_ordem
        limit 50 offset (p_pagina - 1) * 50
    ) registros;
$$;

create or replace function public.gd_consultar(p_id text, p_documento boolean) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
    resultado jsonb;
begin
    select case when p_documento then
        jsonb_build_object('nome', d.documento_nome, 'conteudo_base64', replace(encode(d.documento_conteudo, 'base64'), chr(10), ''))
    else
        jsonb_build_object(
            'id_defesa', d.id_defesa, 'id_auto', d.fk_auto_infracao_id_auto, 'data_envio', d.data_envio,
            'observacoes', d.observacoes, 'documento_nome', d.documento_nome, 'fora_prazo', d.fora_prazo, 'ativa', d.ativa, 'url_defesa', d.url_defesa,
            'auto', jsonb_build_object(
                'id_auto', a.id_auto, 'numero_auto', a.numero_auto, 'status_processo', a.status_processo,
                'possui_defesa', exists (select 1 from public.defesa vinculada where vinculada.fk_auto_infracao_id_auto = a.id_auto),
                'possui_parecer', exists (select 1 from public.parecer p where p.fk_auto_infracao_id_auto = a.id_auto)
            )
        )
    end into resultado
    from public.defesa d join public.auto_infracao a on a.id_auto = d.fk_auto_infracao_id_auto
    where d.id_defesa::text = p_id and (not p_documento or d.documento_conteudo is not null);

    if not found then
        raise sqlstate 'PT404' using message = case when p_documento
            then 'Documento da defesa não encontrado.' else 'Defesa não encontrada.' end;
    end if;
    return resultado;
end;
$$;

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
        if auto.status_processo is distinct from 'Aguardando Defesa'
           or exists (select 1 from public.defesa d where d.fk_auto_infracao_id_auto = auto_id) then
            raise sqlstate 'PT409' using message = 'O auto deve estar aguardando defesa e sem defesa registrada.';
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

notify pgrst, 'reload schema';
commit;
