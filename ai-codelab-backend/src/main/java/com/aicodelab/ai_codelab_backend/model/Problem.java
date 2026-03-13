package com.aicodelab.ai_codelab_backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.util.List;
import java.util.Map;

@Document(collection = "problems")
public class Problem {

    @Id
    private String id;

    @Indexed(unique = true)
    private String slug;

    private String title;
    private String difficulty;
    private String description;
    private List<String> topics;
    private List<Object> examples;
    private List<String> constraints;
    private List<TestCase> testCases;

    /** Parsing preamble per language — injected by backend before running.
     *  Keys: "python", "javascript", "java", "cpp"
     *  NEVER sent to the frontend or shown to the user. */
    private Map<String, String> preamble;

    /** The solve() function stub per language — this is what the user sees and edits.
     *  Keys: "python", "javascript", "java", "cpp" */
    private Map<String, String> starterCode;

    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getTopics() { return topics; }
    public void setTopics(List<String> topics) { this.topics = topics; }

    public List<Object> getExamples() { return examples; }
    public void setExamples(List<Object> examples) { this.examples = examples; }

    public List<String> getConstraints() { return constraints; }
    public void setConstraints(List<String> constraints) { this.constraints = constraints; }

    public List<TestCase> getTestCases() { return testCases; }
    public void setTestCases(List<TestCase> testCases) { this.testCases = testCases; }

    public Map<String, String> getPreamble() { return preamble; }
    public void setPreamble(Map<String, String> preamble) { this.preamble = preamble; }

    public Map<String, String> getStarterCode() { return starterCode; }
    public void setStarterCode(Map<String, String> starterCode) { this.starterCode = starterCode; }
}