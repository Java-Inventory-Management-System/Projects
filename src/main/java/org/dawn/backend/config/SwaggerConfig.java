package org.dawn.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;

@Configuration
public class SwaggerConfig {
    private SecurityScheme createAPIKeyScheme() {
        return new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .bearerFormat("JWT")
                .scheme("bearer");
    }

    @Bean
    public OpenAPI serviceAPI() {
        Contact contact = new Contact()
                .name("DawnBreaker")
                .url("https://dawn-blog.vercel.app");

        License license = new License().name("Apache 2.0");

        ExternalDocumentation doc = new ExternalDocumentation()
                .description("You can refer to Wiki Documentation")
                .url("https://booking-ticket-dummy-url.com/docs");

        Info info = new Info()
                .title("Base")
                .description("This is the REST API")
                .version("v0.0.1")
                .contact(contact)
                .license(license);

        return new OpenAPI()
                .info(info)
                .addSecurityItem(new SecurityRequirement().addList("Bearer Authentication", Arrays.asList("read", "write"))) //JWT auth
                .components(new Components().addSecuritySchemes("Bearer Authentication", createAPIKeyScheme()))
                .externalDocs(doc);
    }

    // All APIs
    @Bean
    public GroupedOpenApi publicApi() {
        return GroupedOpenApi
                .builder()
                .group("public")
                .pathsToMatch("/**")
                .build();
    }
}
