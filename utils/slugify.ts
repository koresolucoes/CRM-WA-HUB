
export const slugify = (text: string): string => {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // split an accented letter in the base letter and the acent
        .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
        .replace(/\s+/g, '_')
        .replace(/[^\w_]+/g, '')
        .replace(/__+/g, '_')
        .replace(/^_+/, '')
        .replace(/_+$/, '');
};
