const axios = require("axios");

const RAW_BASE = "https://raw.githubusercontent.com";

const CODE_EXTENSIONS = [
  ".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".cpp", ".c",
  ".cs", ".go", ".rb", ".php", ".swift", ".kt", ".rs", ".html", ".css",
];

const SKIP_FOLDERS = ["node_modules", ".git", "dist", "build", "__pycache__", ".next", "vendor", "coverage"];

function parseGithubUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/);
  if (!match) throw new Error("Invalid GitHub URL. Use format: https://github.com/owner/repo");
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
    branch: match[3] || "main",
  };
}

function getAuthHeaders() {
  const headers = { "User-Agent": "ai-learning-platform" };
  const token = process.env.GITHUB_TOKEN;
  if (token && token !== "your_github_token_here" && token.length > 10) {
    headers["Authorization"] = `token ${token}`;
  }
  return headers;
}

async function fetchRepoTree(owner, repo, branch) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const response = await axios.get(url, { headers: getAuthHeaders() });
  return response.data.tree
    .filter((item) => item.type === "blob")
    .map((item) => ({ path: item.path, size: item.size || 0 }));
}

async function fetchRepoMeta(owner, repo) {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await axios.get(url, { headers: getAuthHeaders() });
    return {
      description: response.data.description || "",
      stars: response.data.stargazers_count || 0,
      language: response.data.language || "",
      topics: response.data.topics || [],
      homepage: response.data.homepage || "",
    };
  } catch {
    return { description: "", stars: 0, language: "", topics: [], homepage: "" };
  }
}

async function fetchFileContent(owner, repo, branch, filePath) {
  const url = `${RAW_BASE}/${owner}/${repo}/${branch}/${filePath}`;
  const response = await axios.get(url, { responseType: "text", timeout: 8000 });
  return response.data;
}

/**
 * Extract function/method/class names from code using simple regex patterns.
 * Works for JS, Python, Java, Go, etc.
 */
function extractDefinitions(filePath, code) {
  const defs = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    const trimmed = line.trim();

    // JavaScript / TypeScript functions
    let m = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/);
    if (m) { defs.push({ name: m[1], type: "function", line: lineNum }); return; }

    // Arrow functions assigned to const/let
    m = trimmed.match(/^(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
    if (m) { defs.push({ name: m[1], type: "function", line: lineNum }); return; }

    // Classes
    m = trimmed.match(/^(?:export\s+)?class\s+(\w+)/);
    if (m) { defs.push({ name: m[1], type: "class", line: lineNum }); return; }

    // Python functions
    m = trimmed.match(/^def\s+(\w+)\s*\(/);
    if (m) { defs.push({ name: m[1], type: "function", line: lineNum }); return; }

    // Python classes
    m = trimmed.match(/^class\s+(\w+)/);
    if (m) { defs.push({ name: m[1], type: "class", line: lineNum }); return; }

    // Java / C# methods (rough)
    m = trimmed.match(/^(?:public|private|protected|static|async)[\w\s<>[\]]+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+\w+\s*)?\{/);
    if (m && !["if", "for", "while", "switch"].includes(m[1])) {
      defs.push({ name: m[1], type: "method", line: lineNum });
    }
  });

  return defs;
}

/**
 * Main export: fetch a GitHub repo and return rich structured data.
 */
async function analyzeRepo(repoUrl) {
  const { owner, repo, branch } = parseGithubUrl(repoUrl);

  // Try main, fall back to master
  let allFiles;
  let activeBranch = branch;
  try {
    allFiles = await fetchRepoTree(owner, repo, activeBranch);
  } catch {
    activeBranch = "master";
    allFiles = await fetchRepoTree(owner, repo, activeBranch);
  }

  // Fetch repo metadata (description, stars, language)
  const meta = await fetchRepoMeta(owner, repo);

  // Filter to code files only
  const codeFiles = allFiles.filter(({ path }) => {
    const isSkipped = SKIP_FOLDERS.some((skip) => path.includes(`${skip}/`));
    const hasCodeExt = CODE_EXTENSIONS.some((ext) => path.endsWith(ext));
    const isReadme = path.toLowerCase() === "readme.md";
    return !isSkipped && (hasCodeExt || isReadme);
  });

  const readmeFile = codeFiles.find(({ path }) => path.toLowerCase() === "readme.md");
  // Pick up to 8 source files, prefer smaller ones (less likely to be generated)
  const sourceFiles = codeFiles
    .filter(({ path }) => path.toLowerCase() !== "readme.md")
    .sort((a, b) => a.size - b.size)
    .slice(0, 8);

  const filesToFetch = [...(readmeFile ? [readmeFile] : []), ...sourceFiles];

  // Fetch contents in parallel
  const fetched = await Promise.allSettled(
    filesToFetch.map(async ({ path: filePath }) => {
      const content = await fetchFileContent(owner, repo, activeBranch, filePath);
      const lines = content.split("\n");
      const preview = lines.slice(0, 120).join("\n");
      const defs = extractDefinitions(filePath, content);
      return { path: filePath, content: preview, definitions: defs, totalLines: lines.length };
    })
  );

  const fetchedFiles = fetched
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  // Build context string for AI prompts
  const context = fetchedFiles
    .map((f) => `--- FILE: ${f.path} ---\n${f.content}`)
    .join("\n\n")
    .slice(0, 10000);

  // Build file list for display (all code files, not just fetched ones)
  const fileList = codeFiles.map(({ path }) => path);

  // Collect all definitions across fetched files
  const allDefinitions = fetchedFiles.flatMap((f) =>
    f.definitions.map((d) => ({ ...d, file: f.path }))
  );

  return {
    owner,
    repo,
    branch: activeBranch,
    meta,                    // { description, stars, language, topics }
    fileCount: codeFiles.length,
    fileList,                // full list of code file paths
    fetchedFiles: fetchedFiles.map((f) => ({
      path: f.path,
      totalLines: f.totalLines,
      definitions: f.definitions,
    })),
    definitions: allDefinitions,  // all functions/classes found
    context,                 // combined code for AI prompts
  };
}

module.exports = { analyzeRepo };
