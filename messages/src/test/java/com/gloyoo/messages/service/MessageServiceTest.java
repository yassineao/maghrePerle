package com.gloyoo.messages.service;

import com.gloyoo.messages.messages.entity.Message;
import com.gloyoo.messages.messages.entity.Status;
import com.gloyoo.messages.messages.repository.MessageRepository;
import com.gloyoo.messages.messages.service.MessageService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:messages-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Transactional
class MessageServiceTest {

    @Autowired
    private MessageService messageService;

    @Autowired
    private MessageRepository messageRepository;

    @Test
    void sendsMessageAndFindsItBySenderAndProduct() {
        UUID productId = UUID.randomUUID();

        Message saved = messageService.sendMessage("Hello", "alice", productId);

        assertThat(saved.getId()).isPositive();
        assertThat(saved.getDate_sent()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(Status.Not_Read);
        assertThat(messageService.getMessages("alice")).containsExactly(saved);
        assertThat(messageService.getMessagesByProduct(productId)).containsExactly(saved);
    }

    @Test
    void rejectsBlankMessageOrSender() {
        UUID productId = UUID.randomUUID();

        assertThatThrownBy(() -> messageService.sendMessage(" ", "alice", productId))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> messageService.sendMessage("Hello", " ", productId))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> messageService.getMessages(" "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void markingMessageAsReadSetsStatusAndReceivedDate() {
        Message saved = messageService.sendMessage("Hello", "alice", UUID.randomUUID());

        Message read = messageService.markMessageAsRead(saved.getId());

        assertThat(read.getStatus()).isEqualTo(Status.Read);
        assertThat(read.getDate_received()).isNotNull();
        assertThat(messageRepository.findById(saved.getId()))
                .get()
                .extracting(Message::getStatus)
                .isEqualTo(Status.Read);
    }

    @Test
    void deletesExistingMessageAndReportsMissingMessage() {
        Message saved = messageService.sendMessage("Hello", "alice", UUID.randomUUID());

        messageService.deleteMessage(saved.getId());

        assertThat(messageRepository.existsById(saved.getId())).isFalse();
        assertThatThrownBy(() -> messageService.deleteMessage(saved.getId()))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
