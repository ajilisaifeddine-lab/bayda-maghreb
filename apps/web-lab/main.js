(() => {
  // ../../core/lexer.ts
  var WORD_REGEX = /[\p{L}\p{M}_]/u;
  var NUMBER_REGEX = /[0-9]/;
  var Lexer = class {
    constructor(input, keywordsMap) {
      this.position = 0;
      this.line = 1;
      this.col = 1;
      this.input = input;
      this.keywords = new Set(Object.keys(keywordsMap));
    }
    currentChar() {
      return this.input[this.position] || "\0";
    }
    advance() {
      if (this.currentChar() === "\n") {
        this.line++;
        this.col = 1;
      } else {
        this.col++;
      }
      this.position++;
    }
    skipWhitespace() {
      while (/\s/.test(this.currentChar()) && this.currentChar() !== "\0") {
        this.advance();
      }
    }
    tokenize() {
      const tokens = [];
      while (this.position < this.input.length) {
        this.skipWhitespace();
        if (this.position >= this.input.length) break;
        const char = this.currentChar();
        const startLine = this.line;
        const startCol = this.col;
        if (char === '"' || char === "'") {
          const quote = char;
          this.advance();
          let value = "";
          while (this.currentChar() !== quote && this.currentChar() !== "\0") {
            value += this.currentChar();
            this.advance();
          }
          if (this.currentChar() === quote) this.advance();
          tokens.push({ type: "STRING", value, line: startLine, col: startCol });
          continue;
        }
        if (NUMBER_REGEX.test(char)) {
          let value = "";
          while (NUMBER_REGEX.test(this.currentChar()) || this.currentChar() === ".") {
            value += this.currentChar();
            this.advance();
          }
          tokens.push({ type: "NUMBER", value, line: startLine, col: startCol });
          continue;
        }
        if (WORD_REGEX.test(char)) {
          let value = "";
          while (WORD_REGEX.test(this.currentChar()) || NUMBER_REGEX.test(this.currentChar())) {
            value += this.currentChar();
            this.advance();
          }
          const type = this.keywords.has(value) ? "KEYWORD" : "IDENT";
          tokens.push({ type, value, line: startLine, col: startCol });
          continue;
        }
        tokens.push({ type: "SYMBOL", value: char, line: startLine, col: startCol });
        this.advance();
      }
      tokens.push({ type: "EOF", value: "", line: this.line, col: this.col });
      return tokens;
    }
  };

  // ../../core/parser.ts
  var Parser = class {
    constructor(tokens, keywordsMap = {}) {
      this.current = 0;
      this.ifKeywords = [];
      this.elseKeywords = [];
      this.tokens = tokens;
      for (const [key, val] of Object.entries(keywordsMap)) {
        if (val === "if") this.ifKeywords.push(key);
        if (val === "else") this.elseKeywords.push(key);
      }
      if (this.ifKeywords.length === 0) this.ifKeywords.push("idha");
      if (this.elseKeywords.length === 0) this.elseKeywords.push("bla");
    }
    peek() {
      return this.tokens[this.current];
    }
    isAtEnd() {
      return this.peek().type === "EOF";
    }
    advance() {
      if (!this.isAtEnd()) this.current++;
      return this.tokens[this.current - 1];
    }
    match(type, value) {
      const token = this.peek();
      if (token.type === type && (value === void 0 || token.value === value)) {
        this.advance();
        return true;
      }
      return false;
    }
    matchKeyword(keywords) {
      const token = this.peek();
      if (token.type === "KEYWORD" && keywords.includes(token.value)) {
        this.advance();
        return true;
      }
      return false;
    }
    expect(type, errorMsg) {
      if (this.match(type)) return this.tokens[this.current - 1];
      throw new Error(`${errorMsg} (\u0627\u0644\u0633\u0637\u0631 ${this.peek().line})`);
    }
    parse() {
      const body = [];
      while (!this.isAtEnd()) {
        body.push(this.statement());
      }
      return { type: "Program", body };
    }
    statement() {
      if (this.matchKeyword(this.ifKeywords)) {
        this.expect("SYMBOL", "(");
        const test = this.expression();
        this.expect("SYMBOL", ")");
        this.expect("SYMBOL", "{");
        const thenBranch = [];
        while (!this.match("SYMBOL", "}") && !this.isAtEnd()) {
          thenBranch.push(this.statement());
        }
        let elseBranch = void 0;
        if (this.matchKeyword(this.elseKeywords)) {
          this.expect("SYMBOL", "{");
          elseBranch = [];
          while (!this.match("SYMBOL", "}") && !this.isAtEnd()) {
            elseBranch.push(this.statement());
          }
        }
        return { type: "If", test, then: thenBranch, else: elseBranch };
      }
      if (this.peek().type === "KEYWORD" || this.peek().type === "IDENT") {
        const name = this.advance().value;
        this.expect("SYMBOL", "(");
        const args = [];
        if (!this.match("SYMBOL", ")")) {
          do {
            args.push(this.expression());
          } while (this.match("SYMBOL", ","));
          this.expect("SYMBOL", ")");
        }
        return { type: "Call", name, args };
      }
      throw new Error(`\u062C\u0645\u0644\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629 \u0641\u064A \u0627\u0644\u0633\u0637\u0631 ${this.peek().line}`);
    }
    expression() {
      if (this.match("STRING")) {
        return { type: "StringLiteral", value: this.tokens[this.current - 1].value };
      }
      if (this.match("NUMBER")) {
        return { type: "NumberLiteral", value: Number(this.tokens[this.current - 1].value) };
      }
      if (this.match("IDENT") || this.match("KEYWORD")) {
        return { type: "Identifier", name: this.tokens[this.current - 1].value };
      }
      throw new Error(`\u062A\u0639\u0628\u064A\u0631 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0641\u064A \u0627\u0644\u0633\u0637\u0631 ${this.peek().line}`);
    }
  };

  // ../../writers/js-writer.ts
  function toJS(node, keywords) {
    return compileNode(node, 0, keywords);
  }
  function compileNode(node, indentLevel, keywords) {
    const indent = "  ".repeat(indentLevel);
    switch (node.type) {
      case "Program":
        return node.body.map((n) => compileNode(n, indentLevel, keywords)).join("\n");
      case "Call": {
        let funcName = node.name;
        if (keywords[funcName] === "print" || keywords[funcName] === "log") {
          funcName = "console.log";
        }
        const args = node.args.map((arg) => compileNode(arg, 0, keywords)).join(", ");
        return `${indent}${funcName}(${args});`;
      }
      case "If": {
        const test = compileNode(node.test, 0, keywords);
        let code = `${indent}if (${test}) {
`;
        code += node.then.map((n) => compileNode(n, indentLevel + 1, keywords)).join("\n");
        code += `
${indent}}`;
        if (node.else && node.else.length > 0) {
          code += ` else {
`;
          code += node.else.map((n) => compileNode(n, indentLevel + 1, keywords)).join("\n");
          code += `
${indent}}`;
        }
        return code;
      }
      case "StringLiteral":
        return `"${node.value}"`;
      case "NumberLiteral":
        return String(node.value);
      case "Identifier":
        if (keywords[node.name] === "true") return "true";
        if (keywords[node.name] === "false") return "false";
        return node.name;
      default:
        return "";
    }
  }

  // ../../writers/python-writer.ts
  function toPython(node, keywords) {
    return compileNode2(node, 0, keywords);
  }
  function compileNode2(node, indentLevel, keywords) {
    const indent = "    ".repeat(indentLevel);
    switch (node.type) {
      case "Program":
        return node.body.map((n) => compileNode2(n, indentLevel, keywords)).join("\n");
      case "Call": {
        let funcName = node.name;
        if (keywords[funcName] === "print" || keywords[funcName] === "log") {
          funcName = "print";
        }
        const args = node.args.map((arg) => compileNode2(arg, 0, keywords)).join(", ");
        return `${indent}${funcName}(${args})`;
      }
      case "If": {
        const test = compileNode2(node.test, 0, keywords);
        let code = `${indent}if ${test}:
`;
        const thenBody = node.then.map((n) => compileNode2(n, indentLevel + 1, keywords)).join("\n");
        code += thenBody || `${indent}    pass`;
        if (node.else && node.else.length > 0) {
          code += `
${indent}else:
`;
          const elseBody = node.else.map((n) => compileNode2(n, indentLevel + 1, keywords)).join("\n");
          code += elseBody || `${indent}    pass`;
        }
        return code;
      }
      case "StringLiteral":
        return `"${node.value}"`;
      case "NumberLiteral":
        return String(node.value);
      case "Identifier":
        if (keywords[node.name] === "true") return "True";
        if (keywords[node.name] === "false") return "False";
        return node.name;
      default:
        return "";
    }
  }

  // dialects.ts
  var dz_latn_kw = {
    "kteb": "print",
    "ila": "if",
    "sah": "true",
    "ghalt": "false",
    "wela": "else",
    "reviewStatus": "pending"
  };
  var kab_latn_kw = {
    "aru": "print",
    "ma": "if",
    "tidett": "true",
    "tidtt": "true",
    "tdt": "true",
    "mtu": "true",
    "amtu": "true",
    "sahih": "true",
    "shih": "true",
    "sa7i7": "true",
    "mgaz": "false",
    "amgaz": "false",
    "ghalat": "false",
    "wela": "else",
    "wla": "else",
    "reviewStatus": "pending"
  };
  var kab_tifinagh_kw = {
    "\u2D49\u2D37\u2D40\u2D30": "if",
    "\u2D61\u2D3B\u2D4D\u2D4D\u2D30": "else",
    "\u2D59\u2D49\u2D4F\u2D53\u2D4F": "else",
    "\u2D3D\u2D5C\u2D30\u2D31": "print",
    "\u2D33\u2D53\u2D4D": "print",
    "\u2D40\u2D30\u2D47\u2D47": "true",
    "\u2D31\u2D4D\u2D30": "false",
    "\u2D5C\u2D30\u2D61\u2D30": "while",
    "\u2D49\u2D3D\u2D3B\u2D4D": "for",
    "\u2D4E\u2D30": "if",
    "\u2D4E\u2D30\u2D5B\u2D30": "else"
  };
  var ly_latn_kw = {
    "kteb": "print",
    "kan": "if",
    "sahih": "true",
    "ghalet": "false",
    "wela": "else",
    "reviewStatus": "pending"
  };
  var mr_latn_kw = {
    "ktab": "print",
    "idha": "if",
    "haqq": "true",
    "bla": "false",
    "wela": "else",
    "reviewStatus": "pending"
  };
  var shi_latn_kw = {
    "aru": "print",
    "skr": "print",
    "ma": "if",
    "ila": "if",
    "tidett": "true",
    "tidtt": "true",
    "tdt": "true",
    "amgaz": "false",
    "mgaz": "false",
    "wela": "else",
    "wla": "else",
    "maulac": "else",
    "mlac": "else",
    "reviewStatus": "pending"
  };
  var tn_latn_kw = {
    "ekteb": "print",
    "ektb": "print",
    "goul": "print",
    "9oul": "print",
    "9olli": "print",
    "golli": "print",
    "idha": "if",
    "ida": "if",
    "s7i7": "true",
    "shih": "true",
    "ghalet": "false",
    "ghalt": "false",
    "8alt": "false",
    "wella": "else",
    "wlla": "else",
    "reviewStatus": "pending"
  };
  var allKeywords = {
    "dz-latn": dz_latn_kw,
    "kab-latn": kab_latn_kw,
    "kab-tifinagh": kab_tifinagh_kw,
    "ly-latn": ly_latn_kw,
    "mr-latn": mr_latn_kw,
    "shi-latn": shi_latn_kw,
    "tn-latn": tn_latn_kw
  };

  // main.ts
  var editor = document.getElementById("editor");
  var output = document.getElementById("output");
  var runBtn = document.getElementById("run-btn");
  var targetLang = document.getElementById("target-lang");
  var dialectSelect = document.getElementById("dialect-select");
  runBtn.addEventListener("click", () => {
    const code = editor.value;
    output.innerHTML = "";
    try {
      const selectedDialect = dialectSelect.value;
      const keywordsMap = allKeywords[selectedDialect];
      if (!keywordsMap) {
        throw new Error("Dialect dictionary not found");
      }
      const lexer = new Lexer(code, keywordsMap);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens, keywordsMap);
      const ast = parser.parse();
      let result = "";
      if (targetLang.value === "js") {
        result = toJS(ast, keywordsMap);
      } else {
        result = toPython(ast, keywordsMap);
      }
      output.textContent = result;
      output.style.color = "var(--success)";
    } catch (error) {
      output.textContent = "Error: " + error.message;
      output.style.color = "var(--error)";
    }
  });
})();
