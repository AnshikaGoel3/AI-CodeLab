import os
import sys
import json
import re
import pandas as pd
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv

# ── Load secrets ─────────────────────────────────────────────────────────────
load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI")
if not MONGO_URI:
    print("ERROR: MONGODB_URI not set.")
    sys.exit(1)

client     = MongoClient(MONGO_URI)
db         = client["ai_coding_platform"]
collection = db["problems"]
collection.delete_many({})
collection.create_index([("slug", ASCENDING)], unique=True)

df = pd.read_csv("questions_dataset.csv")

# ── De-duplicate by title (keep last — usually the cleaner version) ──────────
df = df.drop_duplicates(subset="title", keep="last").reset_index(drop=True)
print(f"After dedup: {len(df)} problems")

# ── Type detection ────────────────────────────────────────────────────────────
def is_tree(v):
    return isinstance(v, dict) and "val" in v and ("left" in v or "right" in v)

def has_tree_input(inp):
    if not isinstance(inp, dict):
        return False
    return any(is_tree(v) for v in inp.values())

def detect_type(v):
    if v is None:                  return "null"
    if is_tree(v):                 return "tree"
    if isinstance(v, bool):        return "bool"
    if isinstance(v, int):         return "int"
    if isinstance(v, float):       return "float"
    if isinstance(v, str):         return "str"
    if isinstance(v, list):
        if not v:                  return "list_int"
        if isinstance(v[0], list): return "list_list_int"
        if isinstance(v[0], str):  return "list_str"
        if isinstance(v[0], dict): return "list_dict"
        return "list_int"
    if isinstance(v, dict):        return "graph"
    return "str"

def analyze(inp):
    if not isinstance(inp, dict):
        return {}
    return {k: detect_type(v) for k, v in inp.items()}

# ── Type maps ─────────────────────────────────────────────────────────────────
def java_type(t):
    return {
        "int": "int", "float": "double", "str": "String",
        "list_int": "int[]", "list_list_int": "int[][]",
        "list_str": "String[]", "tree": "TreeNode",
        "graph": "String", "bool": "boolean",
        "null": "Object", "list_dict": "String",
    }.get(t, "String")

def cpp_type(t):
    return {
        "int": "int", "float": "double", "str": "string",
        "list_int": "vector<int>", "list_list_int": "vector<vector<int>>",
        "list_str": "vector<string>", "tree": "TreeNode*",
        "graph": "string", "bool": "bool",
        "null": "int", "list_dict": "string",
    }.get(t, "int")

def cpp_param(k, t):
    ct = cpp_type(t)
    return f"{ct}& {k}" if (ct.startswith("vector") or ct == "string") else f"{ct} {k}"

# ── Java helpers (inline string-parsing, no regex) ────────────────────────────
JAVA_HELPERS = (
    '    static String _val(String j,String k){'
    'int i=j.indexOf(k);if(i<0)return "";'
    'int c=j.indexOf(\':\',i)+1;'
    'while(c<j.length()&&j.charAt(c)==\' \')c++;'
    'char f=j.charAt(c);'
    'if(f==\'"\'){int e=j.indexOf(\'"\',c+1);return e<0?"":j.substring(c+1,e);}'
    'if(f==\'[\'||f==\'{\'){char op=f,cl=f==\'[\'?\']\':\'}\';int d=0,e=c;'
    'while(e<j.length()){if(j.charAt(e)==op)d++;else if(j.charAt(e)==cl){if(--d==0){e++;break;}}e++;}'
    'return j.substring(c,e);}'
    'int e=c;while(e<j.length()&&",}]".indexOf(j.charAt(e))<0)e++;'
    'return j.substring(c,e).trim();}\n'
    '    static int _getInt(String j,String k){String v=_val(j,k);try{return v.isEmpty()?0:Integer.parseInt(v);}catch(Exception e){return 0;}}\n'
    '    static double _getDbl(String j,String k){String v=_val(j,k);try{return v.isEmpty()?0:Double.parseDouble(v);}catch(Exception e){return 0;}}\n'
    '    static boolean _getBool(String j,String k){String v=_val(j,k);return v.equals("true")||v.equals("1");}\n'
    '    static String _getStr(String j,String k){return _val(j,k);}\n'
    '    static int[] _getArr(String j,String k){String a=_val(j,k);if(a.length()<2)return new int[0];\n'
    '        a=a.substring(1,a.length()-1).trim();if(a.isEmpty())return new int[0];\n'
    '        String[]p=a.split(",");int[]r=new int[p.length];\n'
    '        for(int i=0;i<p.length;i++)r[i]=Integer.parseInt(p[i].trim().replace("\\"",""));return r;}\n'
    '    static String[] _getStrArr(String j,String k){String a=_val(j,k);if(a.length()<2)return new String[0];\n'
    '        a=a.substring(1,a.length()-1).trim();if(a.isEmpty())return new String[0];\n'
    '        String[]p=a.split(",");String[]r=new String[p.length];\n'
    '        for(int i=0;i<p.length;i++)r[i]=p[i].trim().replace("\\"","");return r;}\n'
    '    static int[][] _get2DArr(String j,String k){String outer=_val(j,k);if(outer.length()<2)return new int[0][];\n'
    '        java.util.List<int[]>res=new java.util.ArrayList<>();int i=0;\n'
    '        while(i<outer.length()){int op=outer.indexOf(\'[\',i);if(op<0)break;\n'
    '            int cl=outer.indexOf(\']\',op);String row=outer.substring(op+1,cl).trim();\n'
    '            if(row.isEmpty()){res.add(new int[0]);}else{\n'
    '                String[]p=row.split(",");int[]r=new int[p.length];\n'
    '                for(int x=0;x<p.length;x++)r[x]=Integer.parseInt(p[x].trim());res.add(r);}\n'
    '            i=cl+1;}return res.toArray(new int[0][]);}\n'
    '    static String _getObj(String j,String k){return _val(j,k);}'
)

# ── C++ helpers — DEPTH-AWARE _getVal (fixes the C++ 500 / wrong-key bug) ────
CPP_HELPERS = r"""#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
using namespace std;

// Depth-aware JSON key lookup — only matches keys at the TOP level (depth==1).
// This prevents false matches inside nested objects/arrays.
static string _getVal(const string& s, const string& k) {
    string key = "\"" + k + "\"";
    int depth = 0;
    bool inStr = false;
    for (size_t i = 0; i < s.size(); i++) {
        char c = s[i];
        if (inStr) {
            if (c == '\\') i++;
            else if (c == '"') inStr = false;
            continue;
        }
        if (c == '{' || c == '[') { depth++; continue; }
        if (c == '}' || c == ']') { depth--; continue; }
        if (c == '"') {
            if (depth == 1 && s.compare(i, key.size(), key) == 0) {
                size_t p = i + key.size();
                while (p < s.size() && s[p] == ' ') p++;
                if (p < s.size() && s[p] == ':') p++;
                while (p < s.size() && s[p] == ' ') p++;
                if (p >= s.size()) return "";
                char vc = s[p];
                if (vc == '"') {
                    size_t e = p + 1;
                    while (e < s.size()) {
                        if (s[e] == '\\') { e += 2; continue; }
                        if (s[e] == '"') break;
                        e++;
                    }
                    return s.substr(p + 1, e - p - 1);
                }
                if (vc == '{' || vc == '[') {
                    char op = vc, cl = (vc == '{') ? '}' : ']';
                    int d = 0; size_t e = p; bool ins = false;
                    while (e < s.size()) {
                        char cc = s[e];
                        if (ins) { if (cc == '\\') e++; else if (cc == '"') ins = false; }
                        else { if (cc == '"') ins = true; else if (cc == op) d++; else if (cc == cl) { if (--d == 0) { e++; break; } } }
                        e++;
                    }
                    return s.substr(p, e - p);
                }
                size_t e = p;
                while (e < s.size() && s[e] != ',' && s[e] != '}' && s[e] != ']') e++;
                string v = s.substr(p, e - p);
                v.erase(0, v.find_first_not_of(" \t\r\n"));
                if (!v.empty()) v.erase(v.find_last_not_of(" \t\r\n") + 1);
                return v;
            }
            inStr = true;
        }
    }
    return "";
}
static int _getInt(const string& s, const string& k) { string v=_getVal(s,k); return v.empty()?0:stoi(v); }
static double _getDbl(const string& s, const string& k) { string v=_getVal(s,k); return v.empty()?0.0:stod(v); }
static bool _getBool(const string& s, const string& k) { string v=_getVal(s,k); return v=="true"||v=="1"; }
static string _getStr(const string& s, const string& k) { return _getVal(s,k); }
static vector<int> _getArr(const string& s, const string& k) {
    string arr=_getVal(s,k); vector<int> v;
    if(arr.size()<2) return v;
    arr=arr.substr(1,arr.size()-2);
    if(arr.find_first_not_of(" \t")==string::npos) return v;
    stringstream ss(arr); string token;
    while(getline(ss,token,',')) {
        token.erase(remove(token.begin(),token.end(),'"'),token.end());
        token.erase(0,token.find_first_not_of(" \t"));
        token.erase(token.find_last_not_of(" \t")+1);
        if(!token.empty()) v.push_back(stoi(token));
    }
    return v;
}
static vector<string> _getStrArr(const string& s, const string& k) {
    string arr=_getVal(s,k); vector<string> v;
    if(arr.size()<2) return v;
    arr=arr.substr(1,arr.size()-2);
    stringstream ss(arr); string token;
    while(getline(ss,token,',')) {
        token.erase(remove(token.begin(),token.end(),'"'),token.end());
        token.erase(0,token.find_first_not_of(" \t"));
        token.erase(token.find_last_not_of(" \t")+1);
        if(!token.empty()) v.push_back(token);
    }
    return v;
}
static vector<vector<int>> _get2DArr(const string& s, const string& k) {
    string outer=_getVal(s,k); vector<vector<int>> res;
    if(outer.size()<2) return res;
    outer=outer.substr(1,outer.size()-2);
    size_t i=0;
    while(i<outer.size()) {
        size_t open=outer.find('[',i); if(open==string::npos) break;
        size_t close=outer.find(']',open);
        string row=outer.substr(open+1,close-open-1);
        vector<int> rowVec; stringstream ss(row); string token;
        while(getline(ss,token,',')) {
            token.erase(0,token.find_first_not_of(" \t"));
            token.erase(token.find_last_not_of(" \t")+1);
            if(!token.empty()) rowVec.push_back(stoi(token));
        }
        res.push_back(rowVec); i=close+1;
    }
    return res;
}
static string _getObj(const string& s, const string& k) { return _getVal(s,k); }"""

# ── Boilerplate generators ────────────────────────────────────────────────────
def gen_python(kt):
    sig = ", ".join(kt.keys())
    # Double-decode guard: if backend accidentally double-serializes, this unwraps it
    lines = [
        "import sys, json",
        "_raw = sys.stdin.read().strip()",
        "data = json.loads(_raw)",
        "if isinstance(data, str): data = json.loads(data)",
    ]
    for k, t in kt.items():
        lines.append(f"{k} = data['{k}']")
    preamble = "\n".join(lines) + f"\n\nprint(solve({sig}))"
    starter  = f"def solve({sig}):\n    # your code here\n    pass"
    return preamble, starter

def gen_javascript(kt):
    keys          = list(kt.keys())
    sig           = ", ".join(keys)
    lines = ["const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));"]
    lines.append(f"const {{ {', '.join(keys)} }} = data;")
    preamble = "\n".join(lines) + f"\n\nconsole.log(solve({sig}));"
    starter  = f"function solve({sig}) {{\n  // your code here\n}}"
    return preamble, starter

def gen_java(kt):
    parse = []
    for k, t in kt.items():
        jt = java_type(t)
        if t == "int":             parse.append(f'        {jt} {k}=_getInt(json,"{k}");')
        elif t == "float":         parse.append(f'        {jt} {k}=_getDbl(json,"{k}");')
        elif t == "str":           parse.append(f'        {jt} {k}=_getStr(json,"{k}");')
        elif t == "list_int":      parse.append(f'        {jt} {k}=_getArr(json,"{k}");')
        elif t == "list_list_int": parse.append(f'        {jt} {k}=_get2DArr(json,"{k}");')
        elif t == "list_str":      parse.append(f'        {jt} {k}=_getStrArr(json,"{k}");')
        else:                      parse.append(f'        String {k}=_getObj(json,"{k}");')
    sig       = ", ".join(f"{java_type(t)} {k}" for k, t in kt.items())
    call_args = ", ".join(kt.keys())
    preamble  = (
        f"import java.util.*;\npublic class Main {{\n"
        f"{JAVA_HELPERS}\n"
        f"    public static void main(String[] args) throws Exception {{\n"
        f"        var sc=new Scanner(System.in);var sb=new StringBuilder();\n"
        f"        while(sc.hasNextLine()) sb.append(sc.nextLine());\n"
        f"        String json=sb.toString();\n"
        + "\n".join(parse)
        + f"\n        System.out.println(solve({call_args}));\n    }}"
    )
    starter = (
        f"    static Object solve({sig}) {{\n"
        f"        // your code here\n"
        f"        return 0;\n"
        f"    }}\n}}"
    )
    return preamble, starter

def gen_cpp(kt):
    parse       = []
    local_decls = []
    for k, t in kt.items():
        ct = cpp_type(t)
        local_decls.append(f"    {ct} {k};")
        if t == "int":             parse.append(f'    {k}=_getInt(input,"{k}");')
        elif t == "float":         parse.append(f'    {k}=_getDbl(input,"{k}");')
        elif t == "str":           parse.append(f'    {k}=_getStr(input,"{k}");')
        elif t == "list_int":      parse.append(f'    {k}=_getArr(input,"{k}");')
        elif t == "list_list_int": parse.append(f'    {k}=_get2DArr(input,"{k}");')
        elif t == "list_str":      parse.append(f'    {k}=_getStrArr(input,"{k}");')
        else:                      parse.append(f'    {k}=_getObj(input,"{k}");')
    sig       = ", ".join(cpp_param(k, t) for k, t in kt.items())
    call_args = ", ".join(kt.keys())

    # Infer return type from expected_output — used for the forward declaration
    # (stored in a closure below; default to int)
    preamble = (
        f"{CPP_HELPERS}\n"
        f"int solve({sig}); // forward declaration\n"
        f"int main(){{\n    string input,line;\n    while(getline(cin,line)) input+=line;\n"
        + "\n".join(local_decls) + "\n"
        + "\n".join(parse)
        + f"\n    cout<<solve({call_args})<<endl;\n    return 0;\n}}"
    )
    starter = (
        f"int solve({sig}) {{\n"
        f"    // your code here\n"
        f"    return 0;\n"
        f"}}"
    )
    return preamble, starter

def generate_boilerplate(test_cases):
    if not test_cases or not isinstance(test_cases[0].get("input"), dict):
        fb_p = {
            "python":     "import sys,json\n_raw=sys.stdin.read().strip()\ndata=json.loads(_raw)\nif isinstance(data,str):data=json.loads(data)\nprint(solve())",
            "javascript": "const data=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));\nconsole.log(solve());",
            "java":       "import java.util.*;\npublic class Main{\n    public static void main(String[] a){System.out.println(solve());}}",
            "cpp":        "#include<iostream>\nusing namespace std;\nint solve();\nint main(){cout<<solve()<<endl;}",
        }
        fb_s = {
            "python":     "def solve():\n    pass",
            "javascript": "function solve() {}",
            "java":       "    static Object solve(){return 0;}\n}",
            "cpp":        "int solve(){return 0;}",
        }
        return fb_p, fb_s

    kt = analyze(test_cases[0]["input"])
    p_py, s_py = gen_python(kt)
    p_js, s_js = gen_javascript(kt)
    p_j,  s_j  = gen_java(kt)
    p_c,  s_c  = gen_cpp(kt)
    return (
        {"python": p_py, "javascript": p_js, "java": p_j, "cpp": p_c},
        {"python": s_py, "javascript": s_js, "java": s_j, "cpp": s_c},
    )

# ── Known expected-output correctors ─────────────────────────────────────────
def _correct_coin_change(d):
    if "coins" not in d or "amount" not in d:
        return None
    coins, amount = d["coins"], d["amount"]
    dp = [float("inf")] * (amount + 1)
    dp[0] = 0
    for i in range(1, amount + 1):
        for c in coins:
            if i >= c and dp[i - c] != float("inf"):
                dp[i] = min(dp[i], dp[i - c] + 1)
    return -1 if dp[amount] == float("inf") else dp[amount]

def _correct_climbing_stairs(d):
    n = d.get("n", 0)
    if n <= 0: return 0
    if n == 1: return 1
    if n == 2: return 2
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b

CORRECTORS = {
    "Coin Change":      _correct_coin_change,
    "Climbing Stairs":  _correct_climbing_stairs,
}

def maybe_fix(title, test_cases):
    fn = CORRECTORS.get(title)
    if not fn:
        return test_cases
    out = []
    for tc in test_cases:
        r = fn(tc["input"])
        out.append({
            "input": tc["input"],
            "expected_output": r if r is not None else tc.get("expected_output", tc.get("output", 0)),
        })
    return out

# ── Main import loop ──────────────────────────────────────────────────────────
inserted = skipped = dropped = 0

for _, row in df.iterrows():
    title = str(row.get("title", "")).strip()
    pid   = str(row.get("id",    "")).strip()
    slug  = f"{pid}-{re.sub(r'[^a-z0-9]+', ' ', title.lower()).strip().replace(' ', '-')}"

    def safe_json(v):
        try:
            if pd.isna(v): return []
        except: pass
        try:    return json.loads(v)
        except: return []

    examples    = safe_json(row.get("examples"))
    constraints = safe_json(row.get("constraints"))
    test_cases  = safe_json(row.get("test_cases"))

    # ── DROP tree problems entirely ───────────────────────────────────────────
    if test_cases and isinstance(test_cases[0].get("input"), dict):
        if has_tree_input(test_cases[0]["input"]):
            dropped += 1
            print(f"✗ Dropped (tree): {title}")
            continue

    test_cases  = maybe_fix(title, test_cases)
    preamble, starterCode = generate_boilerplate(test_cases)

    norm_tcs = []
    for tc in test_cases:
        norm_tcs.append({
            "input":           tc["input"],
            "expected_output": str(tc.get("expected_output", tc.get("output", ""))),
        })

    difficulty = str(row.get("difficulty_level", "Medium")).strip()
    if difficulty not in ("Easy", "Medium", "Hard"):
        difficulty = "Medium"

    doc = {
        "title":       title,
        "slug":        slug,
        "difficulty":  difficulty,
        "topics":      [],
        "description": str(row.get("description", "")),
        "examples":    examples,
        "constraints": constraints,
        "testCases":   norm_tcs,
        "preamble":    preamble,
        "starterCode": starterCode,
    }

    try:
        collection.insert_one(doc)
        inserted += 1
        print(f"✓ {title} ({len(norm_tcs)} test cases)")
    except DuplicateKeyError:
        skipped += 1
        print(f"⚠ Skipped (duplicate slug): {title}")

print(f"\nDone — {inserted} inserted, {skipped} skipped, {dropped} tree-problems dropped")