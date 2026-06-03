const { parse } = require("./parser");
const result = parse('echo "hello world"');
console.log(JSON.stringify(result, null, 2));