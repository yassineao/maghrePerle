package com.gloyoo.messages.messages.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.UUID;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@Table (
        name = "message"
)
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String message;

    private String sender;

    private UUID product;

    @Column(name = "date_sent")
    private Date date_sent;

    @Column(name = "date_received")
    private Date date_received;

    @Enumerated(EnumType.STRING)
    private Status status;
}
