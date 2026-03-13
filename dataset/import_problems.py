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
JAVA_HELPERS = '''    static int _getInt(String j,String k){var m=java.util.regex.Pattern.compile("\\""+k+"\\"\\\\s*:\\\\s*(-?\\\\d+)").matcher(j);return m.find()?Integer.parseInt(m.group(1)):0;}
    static double _getDbl(String j,String k){var m=java.util.regex.Pattern.compile("\\""+k+"\\"\\\\s*:\\\\s*(-?[\\\\d.]+)").matcher(j);return m.find()?Double.parseDouble(m.group(1)):0;}
    static String _getStr(String j,String k){var m=java.util.regex.Pattern.compile("\\""+k+"\\"\\\\s*:\\\\s*\\"([^\\"]*)\\\"").matcher(j);return m.find()?m.group(1):"";}
    static int[] _getArr(String j,String k){var m=java.util.regex.Pattern.compile("\\""+k+"\\"\\\\s*:\\\\s*\\\\[([^\\\\]]*)\\\\]").matcher(j);if(!m.find()||m.group(1).isBlank())return new int[0];var p=m.group(1).split(",");var a=new int[p.length];for(int i=0;i<p.length;i++)a[i]=Integer.parseInt(p[i].trim().replaceAll("\\"",""));return a;}
    static String[] _getStrArr(String j,String k){var m=java.util.regex.Pattern.compile("\\""+k+"\\"\\\\s*:\\\\s*\\\\[([^\\\\]]*)\\\\]").matcher(j);if(!m.find()||m.group(1).isBlank())return new String[0];var p=m.group(1).split(",");var a=new String[p.length];for(int i=0;i<p.length;i++)a[i]=p[i].trim().replaceAll("\\"","");return a;}
    static int[][] _get2DArr(String j,String k){var m=java.util.regex.Pattern.compile("\\""+k+"\\"\\\\s*:\\\\s*\\\\[(.+?)\\\\]\\\\s*[,}]").matcher(j);if(!m.find())return new int[0][];var rows=m.group(1).split("\\\\],\\\\s*\\\\[");var res=new int[rows.length][];for(int i=0;i<rows.length;i++){var cl=rows[i].replaceAll("[\\\\[\\\\]]","");if(cl.isBlank()){res[i]=new int[0];continue;}var p=cl.split(",");res[i]=new int[p.length];for(int c=0;c<p.length;c++)res[i][c]=Integer.parseInt(p[c].trim());}return res;}
    static String _getObj(String j,String k){int idx=j.indexOf("\\""+k+"\\"");if(idx<0)return"null";int c=j.indexOf(':',idx)+1;while(c<j.length()&&j.charAt(c)==' ')c++;if(j.startsWith("null",c))return"null";if(j.charAt(c)!='{')return"null";int d=0,e=c;while(e<j.length()){if(j.charAt(e)=='{')d++;else if(j.charAt(e)=='}'){if(--d==0){e++;break;}}e++;}return j.substring(c,e);}'''

JAVA_TREE = '''    static class TreeNode{int val;TreeNode left,right;TreeNode(int v){this.val=v;}}
    static TreeNode _buildTree(String j){if(j==null||j.equals("null")||j.isEmpty())return null;TreeNode n=new TreeNode(_getInt(j,"val"));n.left=_buildTree(_getObj(j,"left"));n.right=_buildTree(_getObj(j,"right"));return n;}'''

# ── C++ helpers ─────────────────────────────────────────────────────────────
CPP_HELPERS = '''#include <iostream>
#include <vector>
#include <string>
#include <regex>
#include <sstream>
using namespace std;
static int _getInt(const string& s,const string& k){regex r("\\""+k+"\\"\\\\s*:\\\\s*(-?\\\\d+)");smatch m;return regex_search(s,m,r)?stoi(m[1]):0;}
static double _getDbl(const string& s,const string& k){regex r("\\""+k+"\\"\\\\s*:\\\\s*(-?[\\\\d.]+)");smatch m;return regex_search(s,m,r)?stod(m[1]):0;}
static string _getStr(const string& s,const string& k){regex r("\\""+k+"\\"\\\\s*:\\\\s*\\"([^\\"]*)\\\"");smatch m;return regex_search(s,m,r)?m[1].str():"";}
static vector<int> _getArr(const string& s,const string& k){regex r("\\""+k+"\\"\\\\s*:\\\\s*\\\\[([^\\\\]]*)\\\\]");smatch m;vector<int> v;if(!regex_search(s,m,r)||m[1].str().empty())return v;stringstream ss(m[1]);string t;while(getline(ss,t,','))if(!t.empty())v.push_back(stoi(t));return v;}
static vector<string> _getStrArr(const string& s,const string& k){regex r("\\""+k+"\\"\\\\s*:\\\\s*\\\\[([^\\\\]]*)\\\\]");smatch m;vector<string> v;if(!regex_search(s,m,r)||m[1].str().empty())return v;stringstream ss(m[1]);string t;while(getline(ss,t,',')){string x=t;x.erase(remove(x.begin(),x.end(),'"'),x.end());v.push_back(x);}return v;}
static vector<vector<int>> _get2DArr(const string& s,const string& k){regex r("\\""+k+"\\"\\\\s*:\\\\s*\\\\[(.+?)\\\\]\\\\s*[,}]");smatch m;vector<vector<int>> res;if(!regex_search(s,m,r))return res;auto outer=m[1].str();regex row("\\\\[([^\\\\]]*)\\\\]");auto it=sregex_iterator(outer.begin(),outer.end(),row),end;for(;it!=end;it++){vector<int> row;stringstream ss((*it)[1]);string t;while(getline(ss,t,','))if(!t.empty())row.push_back(stoi(t));res.push_back(row);}return res;}
static string _getObj(const string& s,const string& k){size_t idx=s.find("\\""+k+"\\"");if(idx==string::npos)return"null";size_t c=s.find(':',idx)+1;while(c<s.size()&&s[c]==' ')c++;if(s.substr(c,4)=="null")return"null";if(s[c]!='{')return"null";int d=0;size_t e=c;while(e<s.size()){if(s[e]=='{')d++;else if(s[e]=='}'){if(--d==0){e++;break;}}e++;}return s.substr(c,e-c);}'''

CPP_TREE = '''struct TreeNode{int val;TreeNode*left,*right;TreeNode(int v):val(v),left(nullptr),right(nullptr){}};
static TreeNode* _buildTree(const string& j){if(j.empty()||j=="null")return nullptr;auto*n=new TreeNode(_getInt(j,"val"));n->left=_buildTree(_getObj(j,"left"));n->right=_buildTree(_getObj(j,"right"));return n;}'''

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
    lines = [
        "const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));",
        f"const {{ {', '.join(keys)} }} = data;"
    ]
    if has_tree:
        lines += [
            "class TreeNode{constructor(v,l=null,r=null){this.val=v;this.left=l;this.right=r;}}",
            "function _buildTree(d){if(!d)return null;return new TreeNode(d.val,_buildTree(d.left),_buildTree(d.right));}"
        ]
        for k, t in kt.items():
            if t == 'tree':
                lines.append(f"const {k}Root = _buildTree({k});")
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