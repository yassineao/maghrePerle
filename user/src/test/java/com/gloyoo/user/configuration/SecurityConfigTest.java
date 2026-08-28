package com.gloyoo.user.configuration;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {

    @Test
    void allowsProductionFrontendPreflightWithCredentials() {
        SecurityConfig securityConfig = new SecurityConfig(null);
        securityConfig.configuredAllowedOrigins = "";
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/user/login");

        CorsConfiguration cors = securityConfig.corsConfigurationSource()
                .getCorsConfiguration(request);

        assertThat(cors).isNotNull();
        assertThat(cors.checkOrigin("https://products-swart-alpha.vercel.app"))
                .isEqualTo("https://products-swart-alpha.vercel.app");
        assertThat(cors.getAllowedMethods()).contains("OPTIONS", "POST");
        assertThat(cors.getAllowCredentials()).isTrue();
    }
}
