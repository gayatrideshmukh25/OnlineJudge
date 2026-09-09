export const LANGUAGES = [
  { id: 'cpp', label: 'C++', monacoId: 'cpp' },
  { id: 'java', label: 'Java', monacoId: 'java' },
  { id: 'python', label: 'Python', monacoId: 'python' },
];

export const DEFAULT_TEMPLATES = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Write your solution here
    return 0;
}
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your solution here
    }
}
`,
  python: `# Write your solution here


def solve():
    pass


if __name__ == "__main__":
    solve()
`,
};

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export const SUBMISSION_STATUSES = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  RUNTIME_ERROR: 'Runtime Error',
  TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
  COMPILE_ERROR: 'Compile Error',
  PENDING: 'Pending',
};
