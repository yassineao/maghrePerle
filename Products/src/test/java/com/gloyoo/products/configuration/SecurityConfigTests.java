package com.gloyoo.products.configuration;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTests {

    @Test
    void allowsProductionFrontendAndNormalizesConfiguredOrigins() {
        SecurityConfig securityConfig = new SecurityConfig(null);
        securityConfig.configuredAllowedOrigins = " https://preview.example.com/ ";

        CorsConfiguration configuration = securityConfig.corsConfigurationSource()
                .getCorsConfiguration(new MockHttpServletRequest("GET", "/product"));

        assertThat(configuration).isNotNull();
        assertThat(configuration.checkOrigin("https://products-swart-alpha.vercel.app"))
                .isEqualTo("https://products-swart-alpha.vercel.app");
        assertThat(configuration.checkOrigin("https://preview.example.com"))
                .isEqualTo("https://preview.example.com");
    }
}
