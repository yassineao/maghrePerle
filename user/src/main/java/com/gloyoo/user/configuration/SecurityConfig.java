package com.gloyoo.user.configuration;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins:}") String configuredAllowedOrigins;
    private final JwtAuthenticationFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/", "/error", "/health", "/auth/**").permitAll()
                        .requestMatchers(
                                "/user/health",
                                "/user/login",
                                "/user/register",
                                "/user/refresh"
                        ).permitAll()

                        // Admin endpoints
                        .requestMatchers("/admin/**").hasRole("ADMIN")


                        // Everything else needs login
                        .anyRequest().authenticated()
                )

                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) -> {
                            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            res.setContentType("application/json");

                            res.getWriter().write("""
                                    {
                                      "error": "APP_AUTH_REQUIRED",
                                      "message": "This endpoint requires a valid access token.",
                                      "hint": "Log in again so the server can issue a fresh authentication cookie."
                                    }
                                    """);
                        })
                        .accessDeniedHandler((req, res, e) -> {
                            res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            res.setContentType("application/json");

                            res.getWriter().write("""
                                    {
                                      "error": "APP_FORBIDDEN",
                                      "message": "You are authenticated, but you do not have permission to access this endpoint.",
                                      "hint": "This endpoint may require the ADMIN role."
                                    }
                                    """);
                        })
                )

                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();

        List<String> allowedOrigins = new ArrayList<>(List.of(
                "http://localhost:3000",
                "http://localhost:4200",
                "http://localhost:5173",
                "https://products-swart-alpha.vercel.app"
        ));

        for (String origin : configuredAllowedOrigins.split(",")) {
            String trimmedOrigin = origin.trim();
            if (!trimmedOrigin.isBlank()) {
                allowedOrigins.add(trimmedOrigin);
            }
        }

        cfg.setAllowedOriginPatterns(allowedOrigins);

        cfg.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "PATCH",
                "OPTIONS"
        ));

        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of(HttpHeaders.SET_COOKIE));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);

        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {
        return config.getAuthenticationManager();
    }
}
