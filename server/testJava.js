const javaExecutor = require("./src/executors/javaExecutor");

const code = `
public class Main {
    public static void main(String[] args) {
        while (true) {
        }
    }
}
`;

const input = "10 20";

javaExecutor(code, input)
  .then((result) => {
    console.log("RESULT:");
    console.log(result);
  })
  .catch((error) => {
    console.error(error);
  });
