const executeCode = require("./services/executeCode");

async function runTest(name, language, code, testCases) {
  console.log(`\n========== ${name} ==========`);

  console.log("Language:", language);
  console.log("testCases is array:", Array.isArray(testCases));

  try {
    const result = await executeCode(language, code, testCases);
    console.dir(result, { depth: null });
  } catch (error) {
    console.error("Execution failed:", error.message);
  }
}

async function main() {
  // Test 1: Normal execution
  await runTest(
    "Java Normal Execution",
    "java",
    `public class Main {
    public static void main(String[] args) {
        System.out.println(2 + 3);
    }
}`,
    [{ input: "", expected: "5" }],
  );

  // Test 2: Multiple inputs
  await runTest(
    "Java Input Handling",
    "java",
    `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
        sc.close();
    }
}`,
    [
      { input: "5\n3\n", expected: "8" },
      { input: "10\n20\n", expected: "30" },
    ],
  );

  // Test 3: Wrong Answer
  await runTest(
    "Java Wrong Answer",
    "java",
    `public class Main {
    public static void main(String[] args) {
        System.out.println(100);
    }
}`,
    [{ input: "", expected: "5" }],
  );

  // Test 4: Compilation Error
  await runTest(
    "Java Compilation Error",
    "java",
    `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello")
    }
}`,
    [{ input: "", expected: "Hello" }],
  );

  // Test 5: Runtime Error
  await runTest(
    "Java Runtime Error",
    "java",
    `public class Main {
    public static void main(String[] args) {
        int result = 10 / 0;
        System.out.println(result);
    }
}`,
    [{ input: "", expected: "0" }],
  );

  // Test 6: Timeout
  await runTest(
    "Java Timeout",
    "java",
    `public class Main {
    public static void main(String[] args) {
        while (true) {
        }
    }
}`,
    [{ input: "", expected: "" }],
  );

  // Test 7: Memory Limit
  await runTest(
    "Java Memory Limit",
    "java",
    `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<byte[]> blocks = new ArrayList<>();

        while (true) {
            blocks.add(new byte[10 * 1024 * 1024]);
        }
    }
}`,
    [{ input: "", expected: "" }],
  );
}

main().catch(console.error);
