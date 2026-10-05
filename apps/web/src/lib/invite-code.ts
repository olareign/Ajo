/**
 * The shape of a person's invite code: 4-20 letters, numbers, - or _, starting and ending with a
 * letter or number, not case-sensitive. The API holds the rules on which codes are allowed.
 */
export const INVITE_CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,18}[A-Za-z0-9]$/;
