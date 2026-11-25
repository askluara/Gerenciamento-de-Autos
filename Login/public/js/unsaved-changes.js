(() => {
    let alteracoesPendentes = false;
    let ignorarProximaSaida = false;

    const temFormularioEditavel = () => Boolean(
        document.querySelector('#formCadastroFiscal, #form-edicao, #form-infracao') ||
        document.querySelector('#tabela-acoes tr[data-infracao-id]')
    );

    const pedirConfirmacao = () => window.confirmarModal(
        'Há alterações não salvas. Tem certeza de que deseja sair sem salvar?',
        { titulo: 'Sair sem salvar?', tipo: 'danger' }
    );

    window.limparAlteracoesPendentes = () => { alteracoesPendentes = false; };

    document.addEventListener('input', event => {
        if (event.target.matches('input, select, textarea') && (
            event.target.closest('#formCadastroFiscal, #form-edicao, #form-infracao') ||
            event.target.id.startsWith('input-')
        )) alteracoesPendentes = true;
    });
    document.addEventListener('change', event => {
        if (event.target.matches('input, select, textarea') && event.target.closest('#formCadastroFiscal, #form-edicao, #form-infracao')) {
            alteracoesPendentes = true;
        }
    });

    document.addEventListener('click', async event => {
        // Os botões do modal têm seu próprio fluxo de confirmação/cancelamento.
        if (event.target.closest('.app-modal-backdrop')) return;
        if (!alteracoesPendentes || !temFormularioEditavel()) return;

        const cancelar = event.target.closest('button');
        if (cancelar && /cancelar\s*$/i.test(cancelar.textContent.trim())) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (await pedirConfirmacao()) {
                alteracoesPendentes = false;
                if (typeof window.carregarInfracoes === 'function') window.carregarInfracoes();
            }
            return;
        }

        if (cancelar?.type === 'reset' && cancelar.form) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (await pedirConfirmacao()) {
                cancelar.form.reset();
                alteracoesPendentes = false;
            }
            return;
        }

        const link = event.target.closest('a[href]');
        if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
        const destino = new URL(link.href, window.location.href);
        if (destino.href === window.location.href || destino.origin !== window.location.origin) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        if (await pedirConfirmacao()) {
            ignorarProximaSaida = true;
            window.location.assign(destino.href);
        }
    }, true);

    window.addEventListener('beforeunload', event => {
        if (!alteracoesPendentes || ignorarProximaSaida) return;
        event.preventDefault();
        event.returnValue = '';
    });
})();
