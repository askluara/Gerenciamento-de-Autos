(() => {
    const STORAGE_KEY = 'sigai-notificacao-sucesso';
    let toastTimer;

    function mostrarNotificacao(mensagem) {
        document.querySelector('.app-toast-region')?.remove();
        window.clearTimeout(toastTimer);

        const region = document.createElement('div');
        region.className = 'app-toast-region';
        region.setAttribute('role', 'status');
        region.setAttribute('aria-live', 'polite');
        region.innerHTML = `
            <section class="app-toast" aria-label="Ação concluída">
                <span class="app-toast-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>
                </span>
                <div class="app-toast-copy">
                    <strong>Pronto! Ação concluída</strong>
                    <p></p>
                </div>
                <button class="app-toast-close" type="button" aria-label="Fechar aviso">×</button>
                <span class="app-toast-progress" aria-hidden="true"></span>
            </section>`;

        region.querySelector('.app-toast-copy p').textContent = mensagem;
        const toast = region.querySelector('.app-toast');
        const fechar = () => {
            toast.classList.remove('is-visible');
            window.setTimeout(() => region.remove(), 260);
            window.clearTimeout(toastTimer);
        };
        region.querySelector('.app-toast-close').addEventListener('click', fechar);
        document.body.append(region);
        requestAnimationFrame(() => toast.classList.add('is-visible'));
        toastTimer = window.setTimeout(fechar, 5500);
    }

    window.finalizarAcaoFiscal = (mensagem) => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ mensagem }));
        } finally {
            window.location.assign('/home');
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        let aviso;
        try {
            aviso = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
            sessionStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Não foi possível recuperar o aviso da ação:', error);
        }
        if (aviso?.mensagem) mostrarNotificacao(aviso.mensagem);
    });
})();
