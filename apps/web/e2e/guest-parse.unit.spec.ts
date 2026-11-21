import { expect, test } from '@playwright/test';
import { cleanPhone, parseCsv, parseVcf } from '../src/features/event/guest-parse';

test('normalises Indian mobile numbers', () => {
  expect(cleanPhone('98111 11111')).toBe('+919811111111');
  expect(cleanPhone('098111-11111')).toBe('+919811111111');
  expect(cleanPhone('+91 98111 11111')).toBe('+919811111111');
  expect(cleanPhone('919811111111')).toBe('+919811111111');
  expect(cleanPhone('0044 7700 900123')).toBe('+447700900123');
  expect(cleanPhone('12345')).toBeUndefined();
  expect(cleanPhone(undefined)).toBeUndefined();
});

test('parses CSV with quotes, commas inside cells and Excel semicolons', () => {
  expect(parseCsv('Name,Mobile\n"Gupta, Ji",9811111111\nAnita,9822222222\n')).toEqual([
    ['Name', 'Mobile'],
    ['Gupta, Ji', '9811111111'],
    ['Anita', '9822222222'],
  ]);
  expect(parseCsv('Name;Mobile\r\nRavi;98333 33333')).toEqual([
    ['Name', 'Mobile'],
    ['Ravi', '98333 33333'],
  ]);
  expect(parseCsv('a,"say ""hi"""')).toEqual([['a', 'say "hi"']]);
});

test('reads phone contact exports (.vcf), including folded lines', () => {
  const vcf = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Sunita Sharma',
    'TEL;TYPE=CELL:+91 98444 44444',
    'END:VCARD',
    'BEGIN:VCARD',
    'N:Verma;Raj;;;',
    'TEL:09855555555',
    'END:VCARD',
    'BEGIN:VCARD',
    'FN:No Phone',
    'END:VCARD',
  ].join('\r\n');
  expect(parseVcf(vcf)).toEqual([
    { name: 'Sunita Sharma', phone: '+919844444444', maxPax: 2 },
    { name: 'Raj Verma', phone: '+919855555555', maxPax: 2 },
    { name: 'No Phone', phone: undefined, maxPax: 2 },
  ]);
});
