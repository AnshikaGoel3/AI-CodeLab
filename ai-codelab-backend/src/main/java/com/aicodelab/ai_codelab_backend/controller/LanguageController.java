package com.aicodelab.ai_codelab_backend.controller;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class LanguageController {

    @GetMapping("/languages")
    public List<Map<String,Object>> getLanguages() {

        return List.of(

                Map.of(
                        "name","Python",
                        "id",71
                ),

                Map.of(
                        "name","Java",
                        "id",62
                ),

                Map.of(
                        "name","JavaScript",
                        "id",63
                ),

                Map.of(
                        "name","C++",
                        "id",54
                )
        );
    }
}
