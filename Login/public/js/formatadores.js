(function () {
    const somenteNumeros = valor => String(valor ?? '').replace(/\D/g, '');

    function formatarCpf(valor) {
        const numeros = somenteNumeros(valor).slice(0, 11);
        return numeros
            .replace(/^(\d{3})(\d)/, '$1.$2')
            .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/(\.\d{3})(\d{1,2})$/, '$1-$2');
    }

    function formatarTelefone(valor) {
        const numeros = somenteNumeros(valor).slice(0, 11);
        if (numeros.length <= 2) return numeros;
        if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
        if (numeros.length <= 10) {
            return numeros.replace(/^(\d{2})(\d{4})(\d{0,4})$/, (_, ddd, parte1, parte2) => `(${ddd}) ${parte1}${parte2 ? `-${parte2}` : ''}`);
        }
        return numeros.replace(/^(\d{2})(\d{5})(\d{0,4})$/, (_, ddd, parte1, parte2) => `(${ddd}) ${parte1}${parte2 ? `-${parte2}` : ''}`);
    }

    function aplicarMascaras(raiz = document) {
        raiz.querySelectorAll('[data-mask="cpf"], [data-mask="telefone"]').forEach(input => {
            if (input.dataset.maskReady === 'true') return;
            const formatar = input.dataset.mask === 'cpf' ? formatarCpf : formatarTelefone;
            input.addEventListener('input', () => {
                input.value = formatar(input.value);
            });
            input.value = formatar(input.value);
            input.dataset.maskReady = 'true';
        });
    }

    window.somenteNumeros = somenteNumeros;
    window.formatarCpf = formatarCpf;
    window.formatarTelefone = formatarTelefone;
    window.aplicarMascaras = aplicarMascaras;
    document.addEventListener('DOMContentLoaded', () => aplicarMascaras());
})();
