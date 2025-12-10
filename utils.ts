export function toPersianDigits(input: string | number | null | undefined): string {
    if (input === null || input === undefined) return '';
    const s = String(input);
    const map: { [key: string]: string } = {
        '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴',
        '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹',
        ',': ',', '-': '-'
    };
    return s.split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('');
}

export function formatPrice(price: number): string {
    const formattedNum = Number(price).toLocaleString('en-US');
    return `${toPersianDigits(formattedNum)} تومان`;
}