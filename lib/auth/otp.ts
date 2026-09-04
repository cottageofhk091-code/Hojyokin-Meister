export function toHalfWidthDigits(value: string) {
  return value.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

export function sanitizeOtpInput(value: string) {
  return toHalfWidthDigits(value).replace(/\D/g, "").slice(0, 6);
}
