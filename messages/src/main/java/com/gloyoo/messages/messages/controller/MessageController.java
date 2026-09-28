package com.gloyoo.messages.messages.controller;

import com.gloyoo.messages.configuration.AuthenticatedUser;
import com.gloyoo.messages.messages.entity.Message;
import com.gloyoo.messages.messages.service.MessageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/messages")
public class MessageController {
    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping
    public ResponseEntity<Message> sendMessage(
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser
    ) {
        Message message = messageService.sendMessage(
                request.message(),
                authenticatedUser.email(),
                request.product()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    @GetMapping
    public ResponseEntity<List<Message>> getMessage(@RequestParam @NotBlank String sender) {
        return ResponseEntity.ok(messageService.getMessages(sender));
    }

    @GetMapping("/product/{id}")
    public ResponseEntity<List<Message>> getProduct(@PathVariable UUID id) {
        return ResponseEntity.ok(messageService.getMessagesByProduct(id));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Message> markMessageAsRead(@PathVariable int id) {
        return ResponseEntity.ok(messageService.markMessageAsRead(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable int id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }
}
