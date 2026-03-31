package com.aicodelab.ai_codelab_backend.dto;

public class RunCodeRequest {

    private String sourceCode;
    private int    languageId;
    private String stdin;

    // ── FIX: username must be persisted on every submission so that
    //    SubmissionRepository.findByUsernameOrderByCreatedAtDesc() returns
    //    the correct rows for the profile-page submissions count.
    //    The frontend (executionService.js) already sends this field.
    private String username;

    public String getSourceCode()              { return sourceCode; }
    public void   setSourceCode(String v)      { this.sourceCode = v; }

    public int    getLanguageId()              { return languageId; }
    public void   setLanguageId(int v)         { this.languageId = v; }

    public String getStdin()                   { return stdin; }
    public void   setStdin(String v)           { this.stdin = v; }

    public String getUsername()                { return username; }
    public void   setUsername(String v)        { this.username = v; }
}