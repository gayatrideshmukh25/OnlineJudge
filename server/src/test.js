const executeCode = require("./services/executeCode");

const code = `
import java.util.*;

public class Main{
    public static void main(String[] args){
        Scanner sc = new Scanner(System.in);

        int a = sc.nextInt();
        int b = sc.nextInt();

        System.out.println(a+b);
    }
}
`;

const testCases = [
  {
    input: "5 7",
    expected: "12",
  },
  {
    input: "10 20",
    expected: "30",
  },
  {
    input: "100 200",
    expected: "300",
  },
];

(async () => {
  const result = await executeCode("java", code, testCases);
})();
