package com.gloyoo.user.configuration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Configuration
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String ACCESS_TOKEN_COOKIE = "accessToken";
    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws IOException, ServletException {
        String token = getAccessToken(request);

        if (token != null && !token.isBlank()) {
            try {
                var claims = jwtService.parse(token).getBody();
                if ("refresh".equals(claims.get("type"))) {
                    throw new RuntimeException("refresh token cannot authenticate requests");
                }
                Object uidObj = claims.get("uid");

                if (uidObj == null) {
                    throw new RuntimeException("uid missing in token claims");
                }

                UUID uid = UUID.fromString(uidObj.toString());

                String role = (String) claims.get("role");
                String user = (String) claims.get("user");

                if (role == null || role.isBlank()) {
                    throw new RuntimeException("role missing in token claims");
                }

                List<SimpleGrantedAuthority> authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_" + role)
                );

                if (SecurityContextHolder.getContext().getAuthentication() == null) {
                    AuthenticatedUser principal = new AuthenticatedUser(
                            uid,
                            claims.getSubject(),
                            user,
                            role
                    );
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (Exception e) {
                log.warn("Rejected access token on {} {}: {}",
                        request.getMethod(), request.getRequestURI(), e.getMessage());
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("""
                        {
                          "error": "APP_JWT_INVALID_OR_EXPIRED",
                          "message": "The access token was rejected before reaching the controller.",
                          "hint": "Log in again so the server can issue a fresh authentication cookie."
                        }
                        """);
                return;
            }

        }
        chain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.equals("/user/login")
                || path.equals("/user/register")
                || path.equals("/user/refresh")
                || path.equals("/user/health")
                || path.equals("/auth/login")
                || path.equals("/auth/register")
                || path.equals("/auth/refresh");
    }

    private String getCookieValue(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }

    private String getAccessToken(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            String token = authorization.substring(7).trim();
            if (!token.isBlank()) {
                return token;
            }
        }

        return getCookieValue(request, ACCESS_TOKEN_COOKIE);
    }
}
