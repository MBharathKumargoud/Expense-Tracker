package com.expensetracker.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Map frontend files relative to execution workspace or classpath
        String userDir = System.getProperty("user.dir");
        String frontendPath = Paths.get(userDir, "..", "frontend").toAbsolutePath().normalize().toUri().toString();
        
        registry.addResourceHandler("/**")
                .addResourceLocations(frontendPath, "file:frontend/", "classpath:/static/", "classpath:/public/");
    }
}
