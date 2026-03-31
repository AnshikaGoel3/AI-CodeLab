package com.aicodelab.ai_codelab_backend.repository;

import com.aicodelab.ai_codelab_backend.model.Submission;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface SubmissionRepository extends MongoRepository<Submission, String> {

    // All submissions for a user (profile page, ordered newest first)
    List<Submission> findByUsernameOrderByCreatedAtDesc(String username);

    // All submissions for a problem (problem detail page)
    List<Submission> findByProblemSlugOrderByCreatedAtDesc(String slug);

    // ── FIX: returns the distinct list of problem slugs the user has Accepted.
    // Used by AuthService.login() so the frontend restores the correct solved
    // count immediately on sign-in — sourced from real submission data, not a
    // stale field on the User document.
    @Query(value = "{ 'username': ?0, 'status': 'Accepted' }", fields = "{ 'problemSlug': 1 }")
    List<Submission> findAcceptedSubmissionsByUsername(String username);

    // Convenience: same as above but returns just the slugs as strings.
    // Spring Data can't project to a plain List<String> directly, so we use
    // a default method that maps over the Submission objects.
    default List<String> findAcceptedSlugsByUsername(String username) {
        return findAcceptedSubmissionsByUsername(username)
            .stream()
            .map(Submission::getProblemSlug)
            .distinct()
            .toList();
    }
}