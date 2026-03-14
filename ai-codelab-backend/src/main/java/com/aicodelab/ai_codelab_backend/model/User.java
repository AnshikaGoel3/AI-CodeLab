package com.aicodelab.ai_codelab_backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "users")
public class User {

    @Id
    private String id;
    private String username;
    private String email;
    private String password;
    private List<String> solvedSlugs = new ArrayList<>(); // ← persists solved problems

    public User() {}

    public User(String username, String email, String password) {
        this.username  = username;
        this.email     = email;
        this.password  = password;
        this.solvedSlugs = new ArrayList<>();
    }

    public String getId()                        { return id; }
    public void setId(String id)                 { this.id = id; }

    public String getUsername()                  { return username; }
    public void setUsername(String username)     { this.username = username; }

    public String getEmail()                     { return email; }
    public void setEmail(String email)           { this.email = email; }

    public String getPassword()                  { return password; }
    public void setPassword(String password)     { this.password = password; }

    public List<String> getSolvedSlugs()                      { return solvedSlugs; }
    public void setSolvedSlugs(List<String> solvedSlugs)      { this.solvedSlugs = solvedSlugs; }

    public void addSolvedSlug(String slug) {
        if (solvedSlugs == null) solvedSlugs = new ArrayList<>();
        if (!solvedSlugs.contains(slug)) solvedSlugs.add(slug);
    }
}