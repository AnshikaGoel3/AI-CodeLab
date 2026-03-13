package com.aicodelab.ai_codelab_backend.service;

import org.springframework.stereotype.Service;

import com.aicodelab.ai_codelab_backend.model.Problem;
import com.aicodelab.ai_codelab_backend.repository.ProblemRepository;

import java.util.List;

@Service
public class ProblemService {

    private final ProblemRepository problemRepository;

    public ProblemService(ProblemRepository problemRepository) {
        this.problemRepository = problemRepository;
    }

    public List<Problem> getAllProblems() {
        return problemRepository.findAll();
    }

    public Problem getProblemBySlug(String slug) {
        return problemRepository
                .findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Problem not found"));
    }

    public List<Problem> searchProblems(String query) {
        return problemRepository.searchByTitle(query);
    }

}
