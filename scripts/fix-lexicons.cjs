const fs = require('fs');
const path = require('path');
const packagesDir = path.join(__dirname, '../packages');

// Clean arrays mapped inversely: Dialect Word -> Standard Keyword
// ملاحظة: reviewStatus لم يعد هنا؛ انتقل إلى manifest.json (بيانات وصفية).
const coreLexicons = {
  'tn-latn': {
    "ekteb": "print", "ektb": "print", "goul": "print", "9oul": "print", "9olli": "print", "golli": "print",
    "idha": "if", "ida": "if",
    "s7i7": "true", "shih": "true",
    "ghalet": "false", "ghalt": "false", "8alt": "false",
    "wella": "else", "wlla": "else"
  },
  'dz-latn': {
    "kteb": "print",
    "ila": "if",
    "sah": "true",
    "ghalt": "false",
    "wela": "else"
  },
  'ly-latn': {
    "kteb": "print",
    "kan": "if",
    "sahih": "true",
    "ghalet": "false",
    "wela": "else"
  },
  'mr-latn': {
    "ktab": "print",
    "idha": "if",
    "haqq": "true",
    "bla": "false",
    "wela": "else"
  },
  'kab-latn': {
    "aru": "print",
    "ma": "if",
    "tidett": "true", "tidtt": "true", "tdt": "true", "mtu": "true", "amtu": "true", "sahih": "true", "shih": "true", "sa7i7": "true",
    "mgaz": "false", "amgaz": "false", "ghalat": "false",
    "wela": "else", "wla": "else"
  },
  'shi-latn': {
    "aru": "print", "skr": "print",
    "ma": "if", "ila": "if",
    "tidett": "true", "tidtt": "true", "tdt": "true",
    "amgaz": "false", "mgaz": "false",
    "wela": "else", "wla": "else", "maulac": "else", "mlac": "else"
  }
};

Object.keys(coreLexicons).forEach(dir => {
  const dirPath = path.join(packagesDir, dir);
  if (fs.existsSync(dirPath)) {
    const kwPath = path.join(dirPath, 'keywords.json');
    fs.writeFileSync(kwPath, JSON.stringify(coreLexicons[dir], null, 2), 'utf8');
    console.log(`✅ Overwritten clean lexicon: ${dir}`);
  }
});
