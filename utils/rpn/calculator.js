import Token from './token';
export default class Calculator {
    #tdata;

    /**
     * Конструктор калькулятора
     * @param {Map} cells хеш ячеек, содержащих формулы или первичные значения
     */
    constructor(tableData) {
        this.#tdata = tableData;
    }

    /**
     * Расчет значения для формулы
     * @param {Array|String} formula - массив токенов или формула строки
     */
    calc(formula) {
        let tokens = Array.isArray(formula)
            ? formula
            : Token.getTokens(formula);
        let operators = [];
        let operands = [];
        let funcs = [];
        let params = new Map();
        tokens.forEach((token) => {
            switch (token.type) {
                case Types.Number:
                    operands.push(token);
                    break;
                case Types.Cell:
                    if (this.#tdata.isNumber(token.value)) {
                        operands.push(this.#tdata.getNumberToken(token));
                    } else if (this.#tdata.isFormula(token.value)) {
                        let formula = this.#tdata.getTokens(token.value);
                        operands.push(
                            new Token(Types.Number, this.calc(formula))
                        );
                    } else {
                        operands.push(new Token(Types.Number, 0));
                    }
                    break;
                case Types.Function:
                    funcs.push(token);
                    params.set(token, []);
                    operators.push(token);
                    break;
                case Types.Semicolon:
                    this.calcExpression(operands, operators, 1);
                    // получить имя функции из стека операторов
                    let funcToken = operators[operators.length - 2];
                    // извлечь из стека последний операнд и добавить его в параметы функции
                    params.get(funcToken).push(operands.pop());
                    break;
                case Types.Operator:
                    this.calcExpression(operands, operators, token.priority);
                    operators.push(token);
                    break;
                case Types.LeftBracket:
                    operators.push(token);
                    break;
                case Types.RightBracket:
                    this.calcExpression(operands, operators, 1);
                    operators.pop();
                    // если последний оператор в стеке является функцией
                    if (
                        operators.length &&
                        operators[operators.length - 1].type == Types.Function
                    ) {
                        // получить имя функции из стека операторов
                        let funcToken = operators.pop();
                        // получить массив токенов аргументов функции
                        let funcArgs = params.get(funcToken);
                        let paramValues = [];
                        if (operands.length) {
                            // добавить последний аргумент функции
                            funcArgs.push(operands.pop());
                            // получить массив значений всех аргументов функции
                            paramValues = funcArgs.map((item) => item.value);
                        }
                        // вычислить значение функции и положить в стек операндов
                        operands.push(
                            this.calcFunction(funcToken.calc, ...paramValues)
                        );
                    }
                    break;
            }
        });
        this.calcExpression(operands, operators, 0);
        return operands.pop().value;
    }

    /**
     * Вычисление подвыражения внутри (без) скобок
     * @param {Array} operands массив операндов
     * @param {Array} operators массив операторов
     * @param {Number} minPriority минимальный приоритет для вычисления выражения
     */
    calcExpression(operands, operators, minPriority) {
        while (
            operators.length &&
            operators[operators.length - 1].priority >= minPriority
        ) {
            let rightOperand = operands.pop().value;
            let leftOperand = operands.pop().value;
            let operator = operators.pop();
            let result = operator.calc(leftOperand, rightOperand);
            if (isNaN(result) || !isFinite(result)) result = 0;
            operands.push(new Token(Types.Number, result));
        }
    }

    /**
     * Вычисление значений функции
     * @param {T} func - функция обработки аргументов
     * @param  {...Number} params - массив числовых значений аргументов
     */
    calcFunction(calc, ...params) {
        return new Token(Types.Number, calc(...params));
    }
}
