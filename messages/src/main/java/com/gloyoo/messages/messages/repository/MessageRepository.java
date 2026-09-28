package com.gloyoo.messages.messages.repository;

import com.gloyoo.messages.messages.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, Integer> {
    List<Message> findBySender(String sender);

    List<Message> findByProduct(UUID product);
}
