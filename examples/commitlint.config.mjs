export default {
  extends: ['@commitlint/config-conventional'],
  defaultIgnores: true,
  // The built-in matcher misses GitHub's full PR merge subject.
  ignores: [(message) => /^Merge pull request #\d+ from \S+/.test(message)],
};
