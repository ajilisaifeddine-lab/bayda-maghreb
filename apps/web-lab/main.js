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
    constructor(tokens, ifKeyword = "idha") {
      this.current = 0;
      this.tokens = tokens;
      this.ifKeyword = ifKeyword;
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
      if (this.match("KEYWORD", this.ifKeyword) || this.match("KEYWORD", "idha") || this.match("KEYWORD", "ken") || this.match("KEYWORD", "kima")) {
        this.expect("SYMBOL", "(");
        const test = this.expression();
        this.expect("SYMBOL", ")");
        this.expect("SYMBOL", "{");
        const thenBranch = [];
        while (!this.match("SYMBOL", "}") && !this.isAtEnd()) {
          thenBranch.push(this.statement());
        }
        let elseBranch = void 0;
        if (this.match("KEYWORD", "bla")) {
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
  var tnKeywords = {
    "daily": [
      "barra",
      "behi",
      "tawa"
    ],
    "note": "\u0643\u0644\u0645\u0627\u062A \u064A\u0648\u0645\u064A\u0629 \u0644\u0644\u0639\u0631\u0636 \u0641\u0642\u0637 - \u0644\u064A\u0633\u062A \u0643\u0644\u0645\u0627\u062A \u0628\u0631\u0645\u062C\u064A\u0629",
    "ged": "let",
    "ektb": "let",
    "7ot": "let",
    "hott": "let",
    "5alli": "let",
    "7ott": "let",
    "a3mel": "let",
    "a3ml": "let",
    "khalli": "let",
    "goul": "print",
    "9oul": "log",
    "gul": "log",
    "warri": "log",
    "affichi": "log",
    "otba3": "log",
    "9oull": "log",
    "9olo": "log",
    "9ol": "log",
    "a7ki": "log",
    "9oulou": "log",
    "golo": "log",
    "golih": "log",
    "itba3": "log",
    "toulma": "while",
    "lin": "while",
    "len": "while",
    "tulma": "while",
    "tolma": "while",
    "madam": "while",
    "wa9tli": "while",
    "toul": "while",
    "leen": "while",
    "7ata lin": "while",
    "7atalin": "while",
    "wa9teli": "while",
    "wakteli": "while",
    "tama ken": "while",
    "tamaken": "while",
    "ken": "if",
    "ki": "if",
    "idha": "if",
    "kan": "if",
    "idhaa": "if",
    "lkn": "if",
    "itha": "if",
    "edha": "if",
    "louken": "if",
    "idh": "if",
    "ida": "if",
    "eda": "if",
    "idha ken": "if",
    "idhaken": "if",
    "kene": "if",
    "wella": "else",
    "walla": "else",
    "sinn": "else",
    "ella": "else",
    "ama": "else",
    "snn": "else",
    "wela": "else",
    "wla": "else",
    "mouch haka": "else",
    "mouchhaka": "else",
    "mch haka": "else",
    "mchhaka": "else",
    "akeka le": "else",
    "akekale": "else",
    "sinon": "else",
    "makench": "else if",
    "mknch": "else if",
    "s7i7": "true",
    "shih": "true",
    "mrigl": "true",
    "sah": "true",
    "sa7": "true",
    "ghalet": "false",
    "ghalt": "false",
    "8alet": "false",
    "8alt": "false",
    "8lt": "false",
    "mch s7i7": "false",
    "mchs7i7": "false",
    "fi": "in",
    "lelkol": "for",
    "dour": "for",
    "bsh": "for",
    "7ata": "for",
    "hata": "for",
    "taw bech": "for",
    "tawbech": "for",
    "bch ta3mel": "for",
    "bchta3mel": "for",
    "3la 5ater": "for",
    "3la5ater": "for",
    "9os": "break",
    "yezi": "break",
    "7abbes": "break",
    "9oss": "break",
    "o9ef": "break",
    "ogf": "break",
    "ogef": "break",
    "gos": "break",
    "ougef": "break",
    "e9f": "break",
    "fout": "continue",
    "kammel": "continue",
    "kamel": "continue",
    "wasil": "continue",
    "kaml": "continue",
    "kml": "continue",
    "rajja3": "return",
    "rj3": "return",
    "raj3": "return",
    "rj3li": "return",
    "raja3li": "return",
    "forma": "class",
    "9aleb": "class",
    "fct": "function",
    "fonct": "function",
    "5edma": "function",
    "5dma": "function",
    "khedmaa": "function",
    "khedma": "function",
    "7atchay": "null",
    "fer8": "null",
    "mfamach": "null",
    "fr8": "null",
    "mfmch": "null",
    "baddel": "switch",
    "ejbed": "import",
    "5arrej": "export",
    "jdid": "new",
    "jarreb": "try",
    "chedd": "catch",
    "a5iran": "finally",
    "lawa7": "throw",
    "dez": "push",
    "zidli": "push",
    "da5l": "push",
    "da5al": "push",
    "rattab": "sort",
    "saffi": "filter",
    "dezz": "push",
    "dizz": "push",
    "diz": "push",
    "zid": "add",
    "zeed": "add",
    "ziid": "add",
    "let": [
      "khali",
      "7ot",
      "khalli"
    ],
    "print": "goul",
    "if": [
      "itha",
      "ila",
      "ken",
      "idha"
    ],
    "else": [
      "sinon",
      "wella",
      "mela"
    ]
  };

  // main.ts
  var editor = document.getElementById("editor");
  var output = document.getElementById("output");
  var runBtn = document.getElementById("run-btn");
  var targetLang = document.getElementById("target-lang");
  runBtn.addEventListener("click", () => {
    const code = editor.value;
    output.innerHTML = "";
    try {
      const keywordsMap = tnKeywords;
      const ifKeyword = "idha";
      const lexer = new Lexer(code, keywordsMap);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens, ifKeyword);
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
      output.textContent = "\u062E\u0637\u0623: " + error.message;
      output.style.color = "var(--error)";
    }
  });
})();
