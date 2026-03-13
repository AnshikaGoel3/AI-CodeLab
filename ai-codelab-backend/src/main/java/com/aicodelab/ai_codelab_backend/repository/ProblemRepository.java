package com.aicodelab.ai_codelab_backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.aicodelab.ai_codelab_backend.model.Problem;

import java.util.List;
import java.util.Optional;

public interface ProblemRepository extends MongoRepository<Problem, String> {

    Optional<Problem> findBySlug(String slug);

    @Query("{ 'title': { $regex: ?0, $options: 'i' } }")
    List<Problem> searchByTitle(String query);

}
