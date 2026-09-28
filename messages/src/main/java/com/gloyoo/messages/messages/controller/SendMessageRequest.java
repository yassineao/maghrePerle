package com.gloyoo.messages.messages.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SendMessageRequest(
        @NotBlank String message,
        @NotNull UUID product
) {
}
