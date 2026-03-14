import os
import sys
import json
import re
import pandas as pd
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv

# ── Load secrets from .env if present ──────────────────────────────────────
load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI")
if not MONGO_URI:
    print("ERROR: MONGODB_URI not set. Add it to your .env file.")
    sys.exit(1)

client     = MongoClient(MONGO_URI)
db         = client["ai_coding_platform"]
collection = db["problems"]
collection.delete_many({})
collection.create_index([("slug", ASCENDING)], unique=True)

df = pd.read_csv("questions_dataset.csv")

# ── Type detection ──────────────────────────────────────────────────────────
def is_tree(v):
    return isinstance(v, dict) and 'val' in v and ('left' in v or 'right' in v)

def detect_type(v):
    if v is None:              return 'null'
    if is_tree(v):             return 'tree'
    if isinstance(v, bool):    return 'bool'
    if isinstance(v, int):     return 'int'
    if isinstance(v, float):   return 'float'
    if isinstance(v, str):     return 'str'
    if isinstance(v, list):
        if not v:              return 'list_int'
        if isinstance(v[0], list): return 'list_list_int'
        if isinstance(v[0], str):  return 'list_str'
        if isinstance(v[0], dict): return 'list_dict'
        return 'list_int'
    if isinstance(v, dict):    return 'graph'
    return 'str'

def analyze(inp):
    if not isinstance(inp, dict): return {}
    return {k: detect_type(v) for k, v in inp.items()}

# ── Type maps ───────────────────────────────────────────────────────────────
def java_type(t):
    return {'int':'int','float':'double','str':'String','list_int':'int[]',
            'list_list_int':'int[][]','list_str':'String[]','tree':'TreeNode',
            'graph':'String','bool':'boolean','null':'Object','list_dict':'String'}.get(t,'String')

def cpp_type(t):
    return {'int':'int','float':'double','str':'string','list_int':'vector<int>',
            'list_list_int':'vector<vector<int>>','list_str':'vector<string>',
            'tree':'TreeNode*','graph':'string','bool':'bool','null':'int','list_dict':'string'}.get(t,'int')

def cpp_param(k, t):
    ct = cpp_type(t)
    return f"{ct}& {k}" if (ct.startswith('vector') or ct == 'string') else f"{ct} {k}"

# ── Java helpers ────────────────────────────────────────────────────────────
JAVA_HELPERS = '    // ── JSON helpers (no regex — no escaping issues, works on all JDK versions) ──\n    static String _val(String j,String k){\n        int i=j.indexOf(k);if(i<0)return "";\n        int c=j.indexOf(\':\',i)+1;\n        while(c<j.length()&&j.charAt(c)==\' \')c++;\n        char f=j.charAt(c);\n        if(f==\'"\'){int e=j.indexOf(\'"\',c+1);return e<0?"":j.substring(c+1,e);}\n        if(f==\'[\'||f==\'{\'){char op=f,cl=f==\'[\'?\']\':\'}\';int d=0,e=c;\n            while(e<j.length()){if(j.charAt(e)==op)d++;else if(j.charAt(e)==cl){if(--d==0){e++;break;}}e++;}\n            return j.substring(c,e);}\n        int e=c;while(e<j.length()&&",}]".indexOf(j.charAt(e))<0)e++;\n        return j.substring(c,e).trim();}\n    static int _getInt(String j,String k){String v=_val(j,k);try{return v.isEmpty()?0:Integer.parseInt(v);}catch(Exception e){return 0;}}\n    static double _getDbl(String j,String k){String v=_val(j,k);try{return v.isEmpty()?0:Double.parseDouble(v);}catch(Exception e){return 0;}}\n    static boolean _getBool(String j,String k){String v=_val(j,k);return v.equals("true")||v.equals("1");}\n    static String _getStr(String j,String k){return _val(j,k);}\n    static int[] _getArr(String j,String k){String a=_val(j,k);if(a.length()<2)return new int[0];\n        a=a.substring(1,a.length()-1).trim();if(a.isEmpty())return new int[0];\n        String[]p=a.split(",");int[]r=new int[p.length];\n        for(int i=0;i<p.length;i++)r[i]=Integer.parseInt(p[i].trim().replace("\\"",""));return r;}\n    static String[] _getStrArr(String j,String k){String a=_val(j,k);if(a.length()<2)return new String[0];\n        a=a.substring(1,a.length()-1).trim();if(a.isEmpty())return new String[0];\n        String[]p=a.split(",");String[]r=new String[p.length];\n        for(int i=0;i<p.length;i++)r[i]=p[i].trim().replace("\\"","");return r;}\n    static int[][] _get2DArr(String j,String k){String outer=_val(j,k);if(outer.length()<2)return new int[0][];\n        java.util.List<int[]>res=new java.util.ArrayList<>();int i=0;\n        while(i<outer.length()){int op=outer.indexOf(\'[\',i);if(op<0)break;\n            int cl=outer.indexOf(\']\',op);String row=outer.substring(op+1,cl).trim();\n            if(row.isEmpty()){res.add(new int[0]);}else{\n                String[]p=row.split(",");int[]r=new int[p.length];\n                for(int x=0;x<p.length;x++)r[x]=Integer.parseInt(p[x].trim());res.add(r);}\n            i=cl+1;}return res.toArray(new int[0][]);}\n    static String _getObj(String j,String k){return _val(j,k);}'

JAVA_TREE = '    static class TreeNode{int val;TreeNode left,right;TreeNode(int v){this.val=v;}}\n    static TreeNode _buildTree(String j){\n        if(j==null||j.isEmpty()||j.equals("null"))return null;\n        int v=_getInt(j,"val");\n        TreeNode n=new TreeNode(v);\n        String l=_getObj(j,"left"),r=_getObj(j,"right");\n        n.left =(l.isEmpty()||l.equals("null"))?null:_buildTree(l);\n        n.right=(r.isEmpty()||r.equals("null"))?null:_buildTree(r);\n        return n;}'
CPP_HELPERS = '#include <iostream>\n#include <vector>\n#include <string>\n#include <sstream>\n#include <algorithm>\nusing namespace std;\n\n// ── Manual JSON helpers (no regex — works on all Judge0/GCC versions) ──────\n\nstatic string _getVal(const string& s, const string& k) {\n    // Find "key": value  — returns raw value string\n    string search = "\\"" + k + "\\"";\n    size_t idx = s.find(search);\n    if (idx == string::npos) return "";\n    size_t c = s.find(\':\', idx) + 1;\n    while (c < s.size() && s[c] == \' \') c++;\n    // Determine end of value\n    if (s[c] == \'"\') {\n        // string value\n        size_t e = s.find(\'"\', c + 1);\n        return s.substr(c + 1, e - c - 1);\n    }\n    if (s[c] == \'[\' || s[c] == \'{\') {\n        // array or object — find matching bracket\n        char open = s[c], close = (open == \'[\') ? \']\' : \'}\';\n        int depth = 0; size_t e = c;\n        while (e < s.size()) {\n            if (s[e] == open)  depth++;\n            else if (s[e] == close) { if (--depth == 0) { e++; break; } }\n            e++;\n        }\n        return s.substr(c, e - c);\n    }\n    // number or bool — read until , or } or ]\n    size_t e = c;\n    while (e < s.size() && s[e] != \',\' && s[e] != \'}\' && s[e] != \']\') e++;\n    string v = s.substr(c, e - c);\n    // trim whitespace\n    v.erase(0, v.find_first_not_of(" \\t\\r\\n"));\n    v.erase(v.find_last_not_of(" \\t\\r\\n") + 1);\n    return v;\n}\n\nstatic int _getInt(const string& s, const string& k) {\n    string v = _getVal(s, k);\n    return v.empty() ? 0 : stoi(v);\n}\n\nstatic double _getDbl(const string& s, const string& k) {\n    string v = _getVal(s, k);\n    return v.empty() ? 0.0 : stod(v);\n}\n\nstatic bool _getBool(const string& s, const string& k) {\n    string v = _getVal(s, k);\n    return v == "true" || v == "1";\n}\n\nstatic string _getStr(const string& s, const string& k) {\n    return _getVal(s, k);  // already strips quotes\n}\n\nstatic vector<int> _getArr(const string& s, const string& k) {\n    string arr = _getVal(s, k);\n    vector<int> v;\n    if (arr.size() < 2) return v;\n    arr = arr.substr(1, arr.size() - 2);  // strip [ ]\n    if (arr.find_first_not_of(" \\t") == string::npos) return v;\n    stringstream ss(arr);\n    string token;\n    while (getline(ss, token, \',\')) {\n        token.erase(remove(token.begin(), token.end(), \'"\'), token.end());\n        token.erase(0, token.find_first_not_of(" \\t"));\n        token.erase(token.find_last_not_of(" \\t") + 1);\n        if (!token.empty()) v.push_back(stoi(token));\n    }\n    return v;\n}\n\nstatic vector<string> _getStrArr(const string& s, const string& k) {\n    string arr = _getVal(s, k);\n    vector<string> v;\n    if (arr.size() < 2) return v;\n    arr = arr.substr(1, arr.size() - 2);\n    stringstream ss(arr);\n    string token;\n    while (getline(ss, token, \',\')) {\n        token.erase(remove(token.begin(), token.end(), \'"\'), token.end());\n        token.erase(0, token.find_first_not_of(" \\t"));\n        token.erase(token.find_last_not_of(" \\t") + 1);\n        if (!token.empty()) v.push_back(token);\n    }\n    return v;\n}\n\nstatic vector<vector<int>> _get2DArr(const string& s, const string& k) {\n    string outer = _getVal(s, k);\n    vector<vector<int>> res;\n    if (outer.size() < 2) return res;\n    outer = outer.substr(1, outer.size() - 2);  // strip outer [ ]\n    // split by ],[\n    size_t i = 0;\n    while (i < outer.size()) {\n        size_t open = outer.find(\'[\', i);\n        if (open == string::npos) break;\n        size_t close = outer.find(\']\', open);\n        string row = outer.substr(open + 1, close - open - 1);\n        vector<int> rowVec;\n        stringstream ss(row);\n        string token;\n        while (getline(ss, token, \',\')) {\n            token.erase(0, token.find_first_not_of(" \\t"));\n            token.erase(token.find_last_not_of(" \\t") + 1);\n            if (!token.empty()) rowVec.push_back(stoi(token));\n        }\n        res.push_back(rowVec);\n        i = close + 1;\n    }\n    return res;\n}\n\nstatic string _getObj(const string& s, const string& k) {\n    return _getVal(s, k);\n}'

CPP_TREE = '\nstruct TreeNode {\n    int val;\n    TreeNode* left;\n    TreeNode* right;\n    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}\n};\n\nstatic TreeNode* _buildTree(const string& j) {\n    if (j.empty() || j == "null") return nullptr;\n    int val = _getInt(j, "val");\n    string leftStr  = _getObj(j, "left");\n    string rightStr = _getObj(j, "right");\n    TreeNode* node  = new TreeNode(val);\n    node->left  = (leftStr.empty()  || leftStr  == "null") ? nullptr : _buildTree(leftStr);\n    node->right = (rightStr.empty() || rightStr == "null") ? nullptr : _buildTree(rightStr);\n    return node;\n}'

# ── Boilerplate generators ──────────────────────────────────────────────────
def gen_python(kt):
    has_tree = any(t == 'tree' for t in kt.values())
    sig   = ", ".join(kt.keys())
    lines = ["import sys, json", "data = json.loads(sys.stdin.read())"]
    for k, t in kt.items():
        lines.append(f"{k} = data['{k}']")
    if has_tree:
        lines += ["", "class TreeNode:",
                  "    def __init__(self,val=0,left=None,right=None):",
                  "        self.val=val;self.left=left;self.right=right",
                  "def _build_tree(d):",
                  "    if not d: return None",
                  "    return TreeNode(d['val'],_build_tree(d.get('left')),_build_tree(d.get('right')))"]
        for k, t in kt.items():
            if t == 'tree':
                lines.append(f"{k} = _build_tree({k})")
    preamble = "\n".join(lines) + f"\n\nprint(solve({sig}))"
    starter  = f"def solve({sig}):\n    # your code here\n    pass"
    return preamble, starter

def gen_javascript(kt):
    has_tree = any(t == 'tree' for t in kt.values())
    keys = list(kt.keys())
    sig  = ", ".join(keys)

    # Separate tree keys so we never reassign a const variable
    tree_keys    = [k for k, t in kt.items() if t == 'tree']
    non_tree_keys = [k for k in keys if k not in tree_keys]

    lines = ["const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));"]

    # Non-tree params: safe to destructure with const
    if non_tree_keys:
        lines.append(f"const {{ {', '.join(non_tree_keys)} }} = data;")

    if has_tree:
        lines += [
            "class TreeNode{constructor(v,l=null,r=null){this.val=v;this.left=l;this.right=r;}}",
            "function _buildTree(d){if(!d)return null;return new TreeNode(d.val,_buildTree(d.left),_buildTree(d.right));}"
        ]
        for k in tree_keys:
            # Build directly from data — no const reassignment needed
            lines.append(f"const {k} = _buildTree(data['{k}']);")

    preamble = "\n".join(lines) + f"\n\nconsole.log(solve({sig}));"
    starter  = f"function solve({sig}) {{\n  // your code here\n}}"
    return preamble, starter

def gen_java(kt):
    has_tree = any(t == 'tree' for t in kt.values())
    parse = []
    for k, t in kt.items():
        jt = java_type(t)
        if t == 'int':             parse.append(f"        {jt} {k}=_getInt(json,\"{k}\");")
        elif t == 'float':         parse.append(f"        {jt} {k}=_getDbl(json,\"{k}\");")
        elif t == 'str':           parse.append(f"        {jt} {k}=_getStr(json,\"{k}\");")
        elif t == 'list_int':      parse.append(f"        {jt} {k}=_getArr(json,\"{k}\");")
        elif t == 'list_list_int': parse.append(f"        {jt} {k}=_get2DArr(json,\"{k}\");")
        elif t == 'list_str':      parse.append(f"        {jt} {k}=_getStrArr(json,\"{k}\");")
        elif t == 'tree':          parse.append(f"        {jt} {k}=_buildTree(_getObj(json,\"{k}\"));")
        else:                      parse.append(f"        String {k}=_getObj(json,\"{k}\");")
    sig       = ", ".join(f"{java_type(t)} {k}" for k, t in kt.items())
    call_args = ", ".join(kt.keys())
    tree_code = JAVA_TREE if has_tree else ""
    preamble  = (f"import java.util.*;\npublic class Main {{\n"
                 f"{tree_code}\n"
                 f"{JAVA_HELPERS}\n"
                 f"    public static void main(String[] args) throws Exception {{\n"
                 f"        var sc=new Scanner(System.in);var sb=new StringBuilder();\n"
                 f"        while(sc.hasNextLine()) sb.append(sc.nextLine());\n"
                 f"        String json=sb.toString();\n"
                 + "\n".join(parse) +
                 f"\n        System.out.println(solve({call_args}));\n    }}")
    starter   = (f"    static Object solve({sig}) {{\n"
                 f"        // your code here\n"
                 f"        return 0;\n"
                 f"    }}\n}}")
    return preamble, starter

def gen_cpp(kt):
    has_tree    = any(t == 'tree' for t in kt.values())
    parse       = []
    local_decls = []
    for k, t in kt.items():
        ct = cpp_type(t)
        local_decls.append(f"    {ct} {k};")
        if t == 'int':             parse.append(f"    {k}=_getInt(input,\"{k}\");")
        elif t == 'float':         parse.append(f"    {k}=_getDbl(input,\"{k}\");")
        elif t == 'str':           parse.append(f"    {k}=_getStr(input,\"{k}\");")
        elif t == 'list_int':      parse.append(f"    {k}=_getArr(input,\"{k}\");")
        elif t == 'list_list_int': parse.append(f"    {k}=_get2DArr(input,\"{k}\");")
        elif t == 'list_str':      parse.append(f"    {k}=_getStrArr(input,\"{k}\");")
        elif t == 'tree':          parse.append(f"    {k}=_buildTree(_getObj(input,\"{k}\"));")
        else:                      parse.append(f"    {k}=_getObj(input,\"{k}\");")
    sig       = ", ".join(cpp_param(k, t) for k, t in kt.items())
    call_args = ", ".join(kt.keys())
    tree_code = CPP_TREE if has_tree else ""
    preamble  = (f"{CPP_HELPERS}\n{tree_code}\n"
                 f"int solve({sig}); // forward declaration\n"
                 f"int main(){{\n    string input,line;\n    while(getline(cin,line)) input+=line;\n"
                 + "\n".join(local_decls) + "\n"
                 + "\n".join(parse) +
                 f"\n    cout<<solve({call_args})<<endl;\n    return 0;\n}}")
    starter   = (f"int solve({sig}) {{\n"
                 f"    // your code here\n"
                 f"    return 0;\n"
                 f"}}")
    return preamble, starter

def generate_boilerplate(test_cases):
    if not test_cases or not isinstance(test_cases[0].get('input'), dict):
        fb_p = {
            "python":     "import sys,json\ndata=json.loads(sys.stdin.read())\nprint(solve())",
            "javascript": "const data=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));\nconsole.log(solve());",
            "java":       "import java.util.*;\npublic class Main{\n    public static void main(String[] a){System.out.println(solve());}}",
            "cpp":        "#include<iostream>\nusing namespace std;\nint solve();\nint main(){cout<<solve()<<endl;}"
        }
        fb_s = {
            "python":     "def solve():\n    pass",
            "javascript": "function solve() {}",
            "java":       "    static Object solve(){return 0;}\n}",
            "cpp":        "int solve(){return 0;}"
        }
        return fb_p, fb_s
    kt = analyze(test_cases[0]['input'])
    p_py, s_py = gen_python(kt)
    p_js, s_js = gen_javascript(kt)
    p_j,  s_j  = gen_java(kt)
    p_c,  s_c  = gen_cpp(kt)
    return (
        {"python": p_py, "javascript": p_js, "java": p_j, "cpp": p_c},
        {"python": s_py, "javascript": s_js, "java": s_j, "cpp": s_c}
    )

# ── Expected output correctors ──────────────────────────────────────────────
def _tree_vals(n):
    if not n: return []
    return [n['val']] + _tree_vals(n.get('left')) + _tree_vals(n.get('right'))

def _correct_path_sum_k_jumps(d):
    if not all(k in d for k in ('k', 'target_sum', 'tree')): return None
    k, target, tree = d['k'], d['target_sum'], d['tree']
    all_vals = _tree_vals(tree)
    def dfs(node, s):
        if not node: return False
        s += node['val']
        if not node.get('left') and not node.get('right'):
            needed = target - s
            if k == 0: return needed == 0
            r = {0}
            for _ in range(k): r = {x + v for x in r for v in all_vals}
            return needed in r
        return dfs(node.get('left'), s) or dfs(node.get('right'), s)
    return 1 if dfs(tree, 0) else 0

def _correct_coin_change(d):
    if 'coins' not in d or 'amount' not in d: return None
    coins, amount = d['coins'], d['amount']
    dp = [float('inf')] * (amount + 1); dp[0] = 0
    for i in range(1, amount + 1):
        for c in coins:
            if i >= c and dp[i - c] != float('inf'):
                dp[i] = min(dp[i], dp[i - c] + 1)
    return -1 if dp[amount] == float('inf') else dp[amount]

CORRECTORS = {
    "Maximum Path Sum with K Jumps": _correct_path_sum_k_jumps,
    "Coin Change":                   _correct_coin_change,
}

def maybe_fix(title, test_cases):
    fn = CORRECTORS.get(title)
    if not fn: return test_cases
    out = []
    for tc in test_cases:
        r = fn(tc['input'])
        out.append({
            "input": tc['input'],
            "expected_output": r if r is not None else tc.get('expected_output', tc.get('output', 0))
        })
    return out

# ── Main import loop ────────────────────────────────────────────────────────
inserted = skipped = 0

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
    test_cases  = maybe_fix(title, test_cases)
    preamble, starterCode = generate_boilerplate(test_cases)

    norm_tcs = []
    for tc in test_cases:
        norm_tcs.append({
            "input":           json.dumps(tc["input"]) if isinstance(tc["input"], dict) else str(tc["input"]),
            "expected_output": str(tc.get("expected_output", tc.get("output", "")))
        })

    doc = {
        "title":       title,
        "slug":        slug,
        "difficulty":  row.get("difficulty_level", "Medium"),
        "topics":      [],
        "description": row.get("description", ""),
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
        print(f"⚠ Skipped (duplicate): {title}")

print(f"\nDone — {inserted} inserted, {skipped} skipped")