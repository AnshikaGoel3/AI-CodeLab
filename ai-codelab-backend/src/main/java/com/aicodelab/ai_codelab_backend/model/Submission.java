package com.aicodelab.ai_codelab_backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;

@Document(collection = "submissions")
public class Submission {

    @Id
    private String id;
    private String problemSlug;
    private String code;
    private int languageId;
    private String status;
    private int passed;
    private int total;
    private Date createdAt;
    private String username;  

  
    public String getId()                  { return id; }
    public void setId(String id)           { this.id = id; }

    public String getProblemSlug()                     { return problemSlug; }
    public void setProblemSlug(String problemSlug)     { this.problemSlug = problemSlug; }

    public String getCode()                { return code; }
    public void setCode(String code)       { this.code = code; }

    public int getLanguageId()                     { return languageId; }
    public void setLanguageId(int languageId)      { this.languageId = languageId; }

    public String getStatus()                  { return status; }
    public void setStatus(String status)       { this.status = status; }

    public int getPassed()                 { return passed; }
    public void setPassed(int passed)      { this.passed = passed; }

    public int getTotal()                  { return total; }
    public void setTotal(int total)        { this.total = total; }

    public Date getCreatedAt()                     { return createdAt; }
    public void setCreatedAt(Date createdAt)       { this.createdAt = createdAt; }

    public String getUsername()                    { return username; }
    public void setUsername(String username)       { this.username = username; }
}