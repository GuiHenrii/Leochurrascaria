/**
 * Remove acentos e caracteres especiais que costumam quebrar em impressoras térmicas ESC/POS
 * que não possuem suporte nativo a UTF-8/Code Pages específicas.
 */
function sanitizePrinterText(text) {
    if (!text) return "";
    
    // 1. Normaliza para decompor caracteres acentuados (ã -> a + ~)
    // 2. Remove os caracteres de acentuação (marks)
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        // 3. Substitui pontuações ou símbolos que podem ser problemáticos por versões seguras
        .replace(/[^\x00-\x7F]/g, "") // Remove qualquer caractere não-ASCII restante
        .replace(/ç/g, "c")
        .replace(/Ç/g, "C");
}

module.exports = { sanitizePrinterText };
