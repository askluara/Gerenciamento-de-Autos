(function () {
    const css = `
        .app-modal-backdrop{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:20px;background:rgba(15,23,42,.52)}
        .app-modal{width:min(100%,420px);padding:24px;background:#fff;border-radius:14px;box-shadow:0 24px 70px rgba(15,23,42,.28);font-family:Inter,Arial,sans-serif;color:#172033}
        .app-modal h2{margin:0 0 10px;font-size:18px}.app-modal p{margin:0;color:#526078;line-height:1.55;white-space:pre-line}
        .app-modal-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:22px}
        .app-modal-actions button{min-height:38px;padding:8px 16px;border:1px solid #d1d8e3;border-radius:7px;background:#fff;color:#27364e;font-weight:600;cursor:pointer}
        .app-modal-actions button.primary{border-color:#155eef;background:#155eef;color:#fff}
        .app-modal-actions button.danger{border-color:#dc2626;background:#dc2626;color:#fff}
        .app-modal-actions button:focus-visible{outline:3px solid rgba(21,94,239,.25);outline-offset:2px}
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    function abrirModal(mensagem, opcoes = {}) {
        const { titulo = 'Aviso', tipo = 'info', confirmar = false } = opcoes;
        return new Promise(resolve => {
            const backdrop = document.createElement('div');
            backdrop.className = 'app-modal-backdrop';
            backdrop.innerHTML = `<section class="app-modal" role="${confirmar ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-labelledby="app-modal-title" aria-describedby="app-modal-message"><h2 id="app-modal-title"></h2><p id="app-modal-message"></p><div class="app-modal-actions"></div></section>`;
            backdrop.querySelector('#app-modal-title').textContent = titulo;
            backdrop.querySelector('#app-modal-message').textContent = String(mensagem ?? '');
            const actions = backdrop.querySelector('.app-modal-actions');

            const fechar = resultado => {
                document.removeEventListener('keydown', aoPressionarTecla);
                backdrop.remove();
                resolve(resultado);
            };
            const aoPressionarTecla = event => {
                if (event.key === 'Escape' && !confirmar) fechar(false);
            };

            if (confirmar) {
                const cancelar = document.createElement('button');
                cancelar.type = 'button';
                cancelar.textContent = 'Cancelar';
                cancelar.addEventListener('click', () => fechar(false));
                actions.append(cancelar);
            }

            const ok = document.createElement('button');
            ok.type = 'button';
            ok.className = tipo === 'danger' ? 'danger' : 'primary';
            ok.textContent = confirmar ? 'Confirmar' : 'Entendi';
            ok.addEventListener('click', () => fechar(confirmar));
            actions.append(ok);
            backdrop.addEventListener('click', event => {
                if (event.target === backdrop && !confirmar) fechar(false);
            });
            document.addEventListener('keydown', aoPressionarTecla);
            document.body.append(backdrop);
            ok.focus();
        });
    }

    window.abrirModal = abrirModal;
    window.confirmarModal = (mensagem, opcoes = {}) => abrirModal(mensagem, { ...opcoes, confirmar: true, titulo: opcoes.titulo || 'Confirmação' });
    window.concluirAcao = async mensagem => {
        await abrirModal(mensagem, { titulo: 'Ação concluída' });
        window.limparAlteracoesPendentes?.();
        window.location.assign('/home');
    };
})();
