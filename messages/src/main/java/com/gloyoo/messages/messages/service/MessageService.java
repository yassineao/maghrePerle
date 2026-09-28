package com.gloyoo.messages.messages.service;

import com.gloyoo.messages.messages.entity.Message;
import com.gloyoo.messages.messages.entity.Status;
import com.gloyoo.messages.messages.repository.MessageRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class MessageService {
    private final MessageRepository messageRepository;

    public MessageService(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    @Transactional
    public Message sendMessage(String message, String sender, UUID product) {
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("Message must not be blank");
        }
        if (sender == null || sender.isBlank()) {
            throw new IllegalArgumentException("Sender must not be blank");
        }
        if (product == null) {
            throw new IllegalArgumentException("Product ID must not be null");
        }

        Message messageObject = Message
                .builder()
                .message(message)
                .sender(sender)
                .product(product)
                .date_sent(new Date())
                .status(Status.Not_Read)
                .build();
        return messageRepository.save(messageObject);
    }

    public List<Message> getMessages(String sender) {
        if (sender == null || sender.isBlank()) {
            throw new IllegalArgumentException("Sender must not be blank");
        }
        return messageRepository.findBySender(sender);
    }

    public List<Message> getMessagesByProduct(UUID product) {
        if (product == null) {
            throw new IllegalArgumentException("Product ID must not be null");
        }
        return messageRepository.findByProduct(product);
    }

    @Transactional
    public Message markMessageAsRead(int id) {
        if (id <= 0) {
            throw new IllegalArgumentException("Message ID must be positive");
        }
        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Message not found: " + id));
        message.setStatus(Status.Read);
        message.setDate_received(new Date());
        return messageRepository.save(message);
    }

    @Transactional
    public void deleteMessage(int id) {
        if (id <= 0) {
            throw new IllegalArgumentException("Message ID must be positive");
        }
        if (!messageRepository.existsById(id)) {
            throw new EntityNotFoundException("Message not found: " + id);
        }
        messageRepository.deleteById(id);
    }
}
