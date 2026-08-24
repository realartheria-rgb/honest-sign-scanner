// Тест парсера «Честный Знак» — вытаскиваем функции из index.html и проверяем
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let js = blocks.join('\n');

// Вырезаем IIFE-обёртку и DOM-зависимый код: берём только чистые функции парсинга
const start = js.indexOf('const GS1_AI');
const end = js.indexOf('// ====== СОБЫТИЕ: СКАНИРОВАНИЕ');
const pure = js.slice(start, end);

const mod = new Function(pure + '\nreturn { parseCheesnyZnack, parseGS1128, yymmddToDate, ddmmyyToDate };')();
const parse = mod.parseCheesnyZnack;

const GS = '\u001d';
const cases = [
  { name: 'ЧЗ обувь (01+GTIN+21+S/N+91+92)',
    code: '010463003337124621N4N57BRUZ1ML' + GS + '91EE10' + GS + '92rJP7bAoawcHrLbYUqEZ5rSPZAdIBcNRhCXvNzq0Ff1c=',
    expect: { gtin: '04630033371246', serial: 'N4N57BRUZ1ML' } },
  { name: 'ЧЗ табак (01+21 короткий)',
    code: '0104600266033159215Xrb"S',
    expect: { gtin: '04600266033159' } },
  { name: 'Только GTIN c AI 01',
    code: '0104630033371246',
    expect: { gtin: '04630033371246' } },
  { name: 'Чистый GTIN-14',
    code: '04630033371246',
    expect: { gtin: '04630033371246' } },
  { name: 'EAN-13',
    code: '4600266033159',
    expect: { gtin: '04600266033159' } },
  { name: 'UPC-A (12)',
    code: '012345678905',
    expect: { gtin: '00012345678905' } },
  { name: 'EAN-8',
    code: '96385074',
    expect: { gtin: '00000096385074' } },
  { name: 'GS1 в скобках (01)(21)(11)',
    code: '(01)04630033371246(21)ABC123(11)240315',
    expect: { gtin: '04630033371246', serial: 'ABC123', date: '15.03.2024' } },
  { name: 'JSON',
    code: '{"gtin":"04630033371246","serial":"XYZ999"}',
    expect: { gtin: '04630033371246', serial: 'XYZ999' } },
  { name: 'Мусор (не распознан)',
    code: 'https://example.com/hello',
    expect: { parsed: false } },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const r = parse(c.code);
  const errs = [];
  for (const [k, v] of Object.entries(c.expect)) {
    if (r[k] !== v) errs.push(`${k}: ожидалось "${v}", получено "${r[k]}"`);
  }
  if (errs.length === 0) {
    pass++;
    console.log(`OK   ${c.name}`);
    console.log(`     тип=${r.type} gtin=${r.gtin} serial=${r.serial}`);
  } else {
    fail++;
    console.log(`FAIL ${c.name}`);
    errs.forEach(e => console.log(`     ${e}`));
    console.log(`     полный результат: ${JSON.stringify(r)}`);
  }
}
console.log(`\nИтого: ${pass} прошло, ${fail} упало из ${cases.length}`);
process.exit(fail ? 1 : 0);
