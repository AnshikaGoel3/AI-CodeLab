package com.aicodelab.ai_codelab_backend.dto;

public class RunCodeRequest {
    private String sourceCode;
    private int languageId;
    private String stdin;
    private String username;   

    public String getSourceCode()                      { return sourceCode; }
    public void setSourceCode(String sourceCode)       { this.sourceCode = sourceCode; }

    public int getLanguageId()                         { return languageId; }
    public void setLanguageId(int languageId)          { this.languageId = languageId; }

    public String getStdin()                           { return stdin; }
    public void setStdin(String stdin)                 { this.stdin = stdin; }

    public String getUsername()                        { return username; }
    public void setUsername(String username)           { this.username = username; }
}