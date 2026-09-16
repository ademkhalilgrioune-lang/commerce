// ==========================================
// FORMAT DES PRIX EN DINAR ALGÉRIEN
// ==========================================

/**
 * Formatte un prix en Dinar Algérien
 * Exemple: 1500.50 → "1500.50 DA"
 */
export const formatPrice = (prix) => {
    if (prix === undefined || prix === null) return '0 DA';
    return `${Number(prix).toFixed(2)} DA`;
};

/**
 * Formatte un prix avec séparateur d'espace
 * Exemple: 1500.50 → "1 500.50 DA"
 */
export const formatPriceWithSpace = (prix) => {
    if (prix === undefined || prix === null) return '0 DA';
    const formatted = Number(prix).toFixed(2);
    const parts = formatted.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${integerPart}.${parts[1]} DA`;
};

/**
 * Formatte un prix sans décimales
 * Exemple: 1500.50 → "1 500 DA"
 */
export const formatPriceSimple = (prix) => {
    if (prix === undefined || prix === null) return '0 DA';
    const integerPart = Math.round(Number(prix)).toLocaleString('fr-FR');
    return `${integerPart} DA`;
};
