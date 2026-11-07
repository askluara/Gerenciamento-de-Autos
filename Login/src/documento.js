// Identificação e validação de CPF/CNPJ (sem acesso ao banco).
const soDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');

function cpfValido(d) {
    if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
    for (const tamanho of [9, 10]) {
        let soma = 0;
        for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
        if (((soma * 10) % 11) % 10 !== Number(d[tamanho])) return false;
    }
    return true;
}

function cnpjValido(d) {
    if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
    for (const tamanho of [12, 13]) {
        const pesos = tamanho === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
        let soma = 0;
        for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * pesos[i];
        const resto = soma % 11;
        if ((resto < 2 ? 0 : 11 - resto) !== Number(d[tamanho])) return false;
    }
    return true;
}

const formatarCpf = (d) => d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
const formatarCnpj = (d) => d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

// Detecta se o valor é CPF (11 dígitos) ou CNPJ (14 dígitos) e valida os dígitos verificadores.
// Retorna { tipo, coluna, digitos, formatado } ou { erro }.
function identificarDocumento(valor) {
    const digitos = soDigitos(valor);
    if (digitos.length === 11) {
        if (!cpfValido(digitos)) return { erro: 'CPF inválido. Confira os dígitos informados.' };
        return { tipo: 'CPF', coluna: 'cpf', digitos, formatado: formatarCpf(digitos) };
    }
    if (digitos.length === 14) {
        if (!cnpjValido(digitos)) return { erro: 'CNPJ inválido. Confira os dígitos informados.' };
        return { tipo: 'CNPJ', coluna: 'cnpj', digitos, formatado: formatarCnpj(digitos) };
    }
    return { erro: 'Informe um CPF (11 dígitos) ou um CNPJ (14 dígitos).' };
}

module.exports = { identificarDocumento, soDigitos, cpfValido, cnpjValido };
