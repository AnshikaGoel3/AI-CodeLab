package com.aicodelab.ai_codelab_backend.repository;

import com.aicodelab.ai_codelab_backend.model.Submission;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface SubmissionRepository extends MongoRepository<Submission, String> {

    List<Submission> findByProblemSlugOrderByCreatedAtDesc(String problemSlug);

    List<Submission> findByUsernameOrderByCreatedAtDesc(String username);

    List<Submission> findAllByOrderByCreatedAtDesc();
}