(() => {
  // ../../core/lexer.ts
  var WORD_REGEX = /[\p{L}\p{M}_]/u;
  var NUMBER_REGEX = /[0-9]/;
  var Lexer = class {
    constructor(input, keywordsMap2) {
      this.position = 0;
      this.line = 1;
      this.col = 1;
      this.input = input;
      this.keywords = new Set(Object.keys(keywordsMap2));
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
    constructor(tokens) {
      this.current = 0;
      this.tokens = tokens;
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
      if (this.match("KEYWORD", "idha")) {
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
  function toJS(node) {
    return compileNode(node, 0);
  }
  function compileNode(node, indentLevel) {
    const indent = "  ".repeat(indentLevel);
    switch (node.type) {
      case "Program":
        return node.body.map((n) => compileNode(n, indentLevel)).join("\n");
      case "Call": {
        let funcName = node.name;
        if (funcName === "ktab" || funcName === "goul") {
          funcName = "console.log";
        }
        const args = node.args.map((arg) => compileNode(arg, 0)).join(", ");
        return `${indent}${funcName}(${args});`;
      }
      case "If": {
        const test = compileNode(node.test, 0);
        let code = `${indent}if (${test}) {
`;
        code += node.then.map((n) => compileNode(n, indentLevel + 1)).join("\n");
        code += `
${indent}}`;
        if (node.else && node.else.length > 0) {
          code += ` else {
`;
          code += node.else.map((n) => compileNode(n, indentLevel + 1)).join("\n");
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
        if (node.name === "haqq") return "true";
        if (node.name === "bla") return "false";
        return node.name;
      default:
        return "";
    }
  }

  // ../../writers/python-writer.ts
  function toPython(node) {
    return compileNode2(node, 0);
  }
  function compileNode2(node, indentLevel) {
    const indent = "    ".repeat(indentLevel);
    switch (node.type) {
      case "Program":
        return node.body.map((n) => compileNode2(n, indentLevel)).join("\n");
      case "Call": {
        let funcName = node.name;
        if (funcName === "ktab" || funcName === "goul") {
          funcName = "print";
        }
        const args = node.args.map((arg) => compileNode2(arg, 0)).join(", ");
        return `${indent}${funcName}(${args})`;
      }
      case "If": {
        const test = compileNode2(node.test, 0);
        let code = `${indent}if ${test}:
`;
        const thenBody = node.then.map((n) => compileNode2(n, indentLevel + 1)).join("\n");
        code += thenBody || `${indent}    pass`;
        if (node.else && node.else.length > 0) {
          code += `
${indent}else:
`;
          const elseBody = node.else.map((n) => compileNode2(n, indentLevel + 1)).join("\n");
          code += elseBody || `${indent}    pass`;
        }
        return code;
      }
      case "StringLiteral":
        return `"${node.value}"`;
      case "NumberLiteral":
        return String(node.value);
      case "Identifier":
        if (node.name === "haqq") return "True";
        if (node.name === "bla") return "False";
        return node.name;
      default:
        return "";
    }
  }

  // main.ts
  var keywordsMap = {
    "ktab": "print",
    "goul": "print",
    "idha": "if",
    "haqq": "true",
    "bla": "false"
  };
  var editor = document.getElementById("editor");
  var output = document.getElementById("output");
  var runBtn = document.getElementById("run-btn");
  var targetLang = document.getElementById("target-lang");
  runBtn.addEventListener("click", () => {
    const code = editor.value;
    output.innerHTML = "";
    try {
      const lexer = new Lexer(code, keywordsMap);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      let result = "";
      if (targetLang.value === "js") {
        result = toJS(ast);
      } else {
        result = toPython(ast);
      }
      output.textContent = result;
      output.style.color = "var(--success)";
    } catch (error) {
      output.textContent = "\u062E\u0637\u0623: " + error.message;
      output.style.color = "var(--error)";
    }
  });
})();
